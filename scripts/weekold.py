import argparse
import os
import sys
import time

from datetime import datetime, timedelta

WEEK = timedelta(days=7)

def done(old: bool, oldest=None):
    # https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-commands-for-github-actions#using-workflow-commands-to-access-toolkit-functions
    github_workflow_cmd = "::set-output name=weekold::"

    print(github_workflow_cmd, old, sep='')
    print("Are any of the files one week old or older?", old, file=sys.stderr)
    if oldest is not None:
        print("Oldest file is", oldest, "old", file=sys.stderr)
    exit(int(old))

def main():
    parser = argparse.ArgumentParser(description='Test if all file '
        'arguments are at least one week old.')
    parser.add_argument('files', metavar='FILE', nargs='+',
        help='a file to be tested.')
    args = parser.parse_args()

    oldest = timedelta(0)
    now = datetime.now()
    for filename in args.files:
        age = now - datetime.fromtimestamp(os.stat(filename).st_mtime)
        if age > oldest:
            oldest = age
        if age < WEEK:
            done(False, oldest)

    return oldest

if __name__ == "__main__":
    try:
        oldest = main()
        done(True, oldest)
    except Exception as e:
        print(e, file=sys.stderr)
