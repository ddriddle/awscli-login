import argparse
import os
import sys
import time

from datetime import datetime, timedelta

WEEK = timedelta(days=7)

def done(old: bool):
    print("Are any of the files one week old or older?", old, file=sys.stderr)
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
            done(False)

    print("Oldest file is", oldest, "old", file=sys.stderr)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(e, file=sys.stderr)
        exit(1)

    done(True)
