#!/usr/bin/env python
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

def main():
    """Run administrative tasks."""
    # Ensure UTF-8 stdout on Windows console
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')

    # Pre-load environment from .env if present
    base_dir = Path(__file__).resolve().parent
    for env_candidate in [base_dir.parent / '.env', base_dir / '.env']:
        if env_candidate.exists():
            load_dotenv(dotenv_path=env_candidate)

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safevote_backend.settings')

    # If runserver is called without port argument, default to 127.0.0.1:<PORT> (8081)
    if len(sys.argv) > 1 and sys.argv[1] == 'runserver':
        if len(sys.argv) == 2:
            port = os.getenv('PORT', '8081')
            sys.argv.append(f'127.0.0.1:{port}')

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
