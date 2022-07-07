# from contextlib import redirect_stdout, redirect_stderr
# from io import StringIO
import unittest

from multiprocessing import get_start_method
from unittest.mock import call

from ..base import IntegrationTests


class TestNoProfile(IntegrationTests):
    """ Integration tests for no profile. """
    @unittest.skipIf(
        get_start_method() != 'fork',
        "This platform does not suppport fork!"
    )
    def test_login_configure_default_profile(self):
        """ Creates a default entry in ~/.aws-login/config """
        calls = [
            call('ECP Endpoint URL [None]: '),
            call('Username [None]: '),
            call('Enable Keyring [False]: '),
            call('Duo Factor [None]: '),
            call('Role ARN [None]: '),
        ]

        self.assertAwsCliReturns('login', 'configure', code=0, calls=calls)
