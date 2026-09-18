from django.core.management.base import BaseCommand
from utils.database import get_db, check_db_connection

class Command(BaseCommand):
    help = "Inspect MongoDB connection and collection document counts matching check_db_status.js"

    def handle(self, *args, **options):
        self.stdout.write("Connecting to MongoDB...")
        if not check_db_connection():
            self.stderr.write(self.style.ERROR("[FAIL] Failed to connect to MongoDB!"))
            return

        self.stdout.write(self.style.SUCCESS("[OK] Connected to MongoDB."))
        db = get_db()
        collections = db.list_collection_names()

        self.stdout.write(f"\nCollections in '{db.name}' database:")
        for col_name in collections:
            count = db[col_name].count_documents({})
            self.stdout.write(f"- {col_name}: {count} documents")
