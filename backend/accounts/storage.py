from django.core.files.storage import Storage
from django.core.files.base import ContentFile
from pymongo import MongoClient
from gridfs import GridFS
import os

class GridFSStorage(Storage):
    """Custom storage class to store files in MongoDB GridFS"""
    
    def __init__(self):
        self.client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017'))
        self.db = self.client.get_database()
        self.fs = GridFS(self.db)
    
    def _save(self, name, content):
        """Save file to GridFS"""
        file_id = self.fs.put(content, filename=name)
        return str(file_id)
    
    def exists(self, name):
        return self.fs.exists({'filename': name})
    
    def url(self, name):
        # GridFS doesn't provide direct URLs
        return f'/media/{name}'
    
    def delete(self, name):
        try:
            file = self.fs.find_one({'filename': name})
            if file:
                self.fs.delete(file._id)
        except:
            pass