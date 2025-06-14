# Rudimentary documentation for the aws-cli plugin API can be found
# here: https://github.com/aws/aws-cli/issues/1261
import copy
import json
import logging
import os
import subprocess

from argparse import Namespace
from tempfile import NamedTemporaryFile, TemporaryDirectory

try:
    from awscli.customizations.commands import BasicCommand
except ImportError:  # pragma: no cover
    class BasicCommand():  # type: ignore
        pass

try:
    from botocore.session import Session
except ImportError:  # pragma: no cover
    class Session():  # type: ignore
        pass

from .configure import configure, exit_if_credential_process_not_set

logger = logging.getLogger(__package__)


def awscli_initialize(cli):
    """ Entry point called by awscli """
    cli.register('building-command-table.main', inject_commands)


def inject_commands(command_table, session: Session, **kwargs):
    """
    Used to inject top-level commands in the awscli command list.
    """
    command_table['login'] = Login(session)
    command_table['logout'] = Logout(session)


class ExternalCommand(BasicCommand):
    """
    Used to run subcommands in the external aws-login script.
    """

    def _run_main(self, args: Namespace, parsed_globals):
        with TemporaryDirectory() as tmpdir:
            tmp = NamedTemporaryFile(dir=tmpdir, delete=False)
            tmp.write(bytes(json.dumps(vars(args)), 'utf-8'))
            tmp.close()

            cmd = ["aws-login", f"--{self.NAME}", tmp.name]
            if self._session.profile:
                cmd += ["--profile", self._session.profile]

            environ = os.environ.copy()
            # Restore LD_LIBRARY_PATH to avoid C library conflicts #222 #230
            if "LD_LIBRARY_PATH_ORIG" in environ:
                orig = environ["LD_LIBRARY_PATH_ORIG"]
                environ["LD_LIBRARY_PATH"] = orig
                del environ["LD_LIBRARY_PATH_ORIG"]
            return subprocess.run(cmd, env=environ).returncode


class Login(ExternalCommand):
    NAME = 'login'
    DESCRIPTION = ('is a plugin that manages retrieving and rotating'
                   ' Amazon STS keys using the Shibboleth IdP and Duo'
                   ' for authentication.')
    SYNOPSIS = ('aws login [options] <subcommand>')

    SUBCOMMANDS = [
        {'name': 'alias', 'command_class': None},
        {'name': 'configure', 'command_class': None},
    ]

    def __init__(self, Session):
        self.SUBCOMMANDS[0]['command_class'] = AccountNames
        self.SUBCOMMANDS[1]['command_class'] = Configure
        return super().__init__(Session)

    # tests/util.py:login_cli_args defaults must match this table
    ARG_TABLE = [
        # Ordering matches order in docs/readme.rst
        # Basic Properties (can be set interactively)
        {
            'name': 'ecp-endpoint-url',
            'no_paramfile': True,
            'default': None,
            'help_text': 'ECP endpoint URL of the IdP'
        },
        {
            'name': 'username',
            'default': None,
            'help_text': 'Username to use on login to IdP'
        },
        {
            'name': 'password',
            'default': None,
            'help_text': 'Password to use on login to IdP'
        },
        {
            'name': 'factor',
            'default': None,
            'help_text': 'The Duo factor to use on login'
        },
        {
            'name': 'passcode',
            'default': None,
            'help_text': 'A Duo passcode'
        },
        {
            'name': 'role-arn',
            'default': None,
            'help_text': 'The Role ARN to select. '
                         'If the IdP returns a single Role it is autoselected.'
        },
        # Advanced Properties (can NOT be set interactively)
        {
            'name': 'duration',
            'default': None,
            'cli_type_name': 'integer',
            'help_text': 'STS credential lifetime in seconds'
        },
        {
            'name': 'http-header-factor',
            'default': None,
            'help_text': 'HTTP Header to store the user\'s Duo factor'
        },
        {
            'name': 'http-header-passcode',
            'default': None,
            'help_text': 'HTTP Header to store the user\'s Duo passcode'
        },
        {
            'name': 'verify-ssl-certificate',
            'default': None,
            'cli_type_name': 'boolean',
            'help_text': 'Verifies the SSL certificate of the IdP'
        },
        # CLI only
        {
            'name': 'ask-password',
            'action': 'store_true',
            'default': False,
            'help_text': 'Force prompt for password'
        },
        {
            'name': 'force-refresh',
            'action': 'store_true',
            'default': False,
            'help_text': 'Forces a login attempt to the IdP using cookies'
        },
        {
            'name': 'verbose',
            'action': 'count',
            'default': 0,
            'cli_type_name': 'integer',
            'help_text': 'Display verbose output'
        },
        {
            'name': 'debug-info',
            'action': 'store_true',
            'default': False,
            'help_text': 'Display debug information'
        },
        {
            'name': 'save-http-traffic',
            'default': None,
            'help_text': 'Save http traffic to a file for debugging'
        },
        {
            'name': 'load-http-traffic',
            'default': None,
            'help_text': 'Load http traffic from file for debugging'
        },
    ]

    UPDATE = False

    def _run_main(self, args: Namespace, parsed_globals):
        r = exit_if_credential_process_not_set(copy.copy(args), self._session)
        if r:
            return r
        else:
            return super()._run_main(args, self._session)


class Logout(ExternalCommand):
    NAME = 'logout'
    DESCRIPTION = ('''
Log out of selected profile by clearing the profile's credentials
stored in ~/.aws-login/credentials.
''')
    SYNOPSIS = ('aws logout [options]')

    ARG_TABLE = [
        {
            'name': 'all',
            'action': 'store_true',
            'default': False,
            'help_text': 'Log out of all profiles',
        },
        {
            'name': 'verbose',
            'action': 'count',
            'default': 0,
            'cli_type_name': 'integer',
            'help_text': 'Display verbose output',
        },
    ]

    UPDATE = False


class AccountNames(ExternalCommand):
    NAME = 'alias'
    DESCRIPTION = ('''
Configure account name aliases file ~/.aws-login/alias. If this
command is run with no arguments, you will be prompted to provide
an alias for each AWS account you have access to. If your alias
file does not exist, it will be created for you. To keep an existing
value, hit enter when prompted for the value. When you are prompted
for information, the current value will be displayed in [brackets].
If the config item has no value, it will be displayed as [None] or
as the account alias as returned by: aws iam list-account-aliases.
''')
    SYNOPSIS = ('aws login alias [options]')

    ARG_TABLE = [
        {
            'name': 'auto',
            'action': 'store_true',
            'default': False,
            'cli_type_name': 'boolean',
            'help_text': 'Automatically update the ~/.aws-login/alias file '
                         'with new account names without prompting the user. '
                         'Preexisting names found in the alias file are '
                         'preserved.'
        }
    ]


class Configure(BasicCommand):
    NAME = 'configure'
    DESCRIPTION = ('''
Configure LOGIN options. If this command is run with no arguments,
you will be prompted for configuration values such as your IdP's
ECP endpoint URL and username. You can configure a named profile
using the --profile argument. If your config file does not exist
(the default location is ~/.aws-login/config), it will be created
for you. To keep an existing value, hit enter when prompted for the
value. When you are prompted for information, the current value
will be displayed in [brackets]. If the config item has no value,
it be displayed as [None].

=======================
Configuration Variables
=======================

The following configuration variables are supported in the config
file:

* **ecp_endpoint_url** - The ECP endpoint URL of the IDP to use for AuthN
* **username** - The username to use on login to the IdP.
* **password** - The password to use on login to the IdP.
* **factor** - The Duo factor to use for 2FA
* **passcode** - A Duo passcode
* **role_arn** - The role ARN to select
* **enable_keyring** - If enabled retrieve password from keyring
* **duration** - Time in seconds credentials are valid
* **http_header_factor** - HTTP Header to store Duo factor
* **http_header_passcode** - HTTP Header to store passcode
* **verify_ssl_certificate** - Set to False to skip check of IdP SSL cert
''')
    SYNOPSIS = ('aws login configure [options]')

    ARG_TABLE = [
        {
            'name': 'verbose',
            'action': 'count',
            'default': 0,
            'cli_type_name': 'integer',
            'help_text': 'Display verbose output'
        },
    ]

    UPDATE = False

    EXAMPLES = ('''
To create a new configuration::\n
\n
    $ aws login configure
    ECP Endpoint URL [None]: https://shib.foo.edu/idp/profile/SAML2/SOAP/ECP
    Username [None]: myusername
    Enable Keyring [False]:
    Duo Factor [None]: push
    Role ARN [None]:
\n
To update just the Duo factor::\n
\n
    $ aws login configure
    ECP Endpoint URL [https://shib.foo.edu/idp/profile/SAML2/SOAP/ECP]:
    Username [myusername]:
    Enable Keyring [False]:
    Duo Factor [push]: sms
    Role ARN [None]:
''')

    def _run_main(self, args: Namespace, parsed_globals):
        return configure(args, self._session)
