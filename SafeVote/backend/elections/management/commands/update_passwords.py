from django.core.management.base import BaseCommand
from utils.database import get_students_collection
from utils.security import hash_password

class Command(BaseCommand):
    help = "Update student passwords matching update_passwords.js"

    def add_arguments(self, parser):
        parser.add_argument('--password', type=str, default='SIET', help='Password to set for all students')
        parser.add_argument('--hash', action='store_true', help='Store password as secure PBKDF2 hash instead of plaintext')

    def handle(self, *args, **options):
        new_pass = options['password']
        should_hash = options['hash']

        stored_value = hash_password(new_pass) if should_hash else new_pass

        self.stdout.write("Connected to MongoDB for password update...")
        students_col = get_students_collection()
        result = students_col.update_many(
            {},
            {"$set": {"password": stored_value}}
        )

        self.stdout.write(f"Matched: {result.matched_count} students")
        self.stdout.write(f"Updated: {result.modified_count} students")
        self.stdout.write(self.style.SUCCESS(f"Done! Student passwords updated."))
