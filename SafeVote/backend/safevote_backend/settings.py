import os
from pathlib import Path
from dotenv import load_dotenv
import corsheaders.defaults

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from SafeVote/.env or backend/.env
env_paths = [BASE_DIR.parent / '.env', BASE_DIR / '.env']
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-safevote-backend-production-key-2024')

DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'accounts.apps.AccountsConfig',
    'elections.apps.ElectionsConfig',
    'candidates.apps.CandidatesConfig',
    'voters.apps.VotersConfig',
    'voting.apps.VotingConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'safevote_backend.middleware.SecurityHeadersMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'safevote_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR.parent],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'safevote_backend.wsgi.application'
ASGI_APPLICATION = 'safevote_backend.asgi.application'

# Internal SQLite database for Django admin/sessions (app data is in MongoDB)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = []

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = True  # Permissive for local development & API parity
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(corsheaders.defaults.default_headers) + [
    'x-admin-key',
    'x-student-token',
    'x-reg-no',
    'x-staff-token',
    'x-staff-id',
]

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'UNAUTHENTICATED_USER': None,
}

# SafeVote Environment & MongoDB Configuration
MONGO_URI = os.getenv('MONGO_URI')
PORT = int(os.getenv('PORT', '8081'))
BLOCKCHAIN_SALT = os.getenv('BLOCKCHAIN_SALT', 'safevote_secret_salt_2024')
ADMIN_KEY_SALT = os.getenv('ADMIN_KEY_SALT', 'safevote_admin_salt_2024')
VOTER_SALT = os.getenv('VOTER_SALT', 'safevote_salt_2024')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
