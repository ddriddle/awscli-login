# Integration tests for aws login configure

load 'clean'

@test "Ensure plugin does not import external modules" {
    PYTHON=$TEST_TEMP_DIR/venv/bin/python

    # Install awscli-login without deps
    python -m venv $TEST_TEMP_DIR/venv
    $PYTHON -m pip install botocore
    $PYTHON -m pip install --no-deps ../..

    # Import plugin in clean venv
    $PYTHON -c 'from awscli_login import plugin'
}
