import os
from dotenv import load_dotenv
from pymongo import MongoClient
from typing import Optional
from schemerpipe.models import Collection
import boto3

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")
COLLECTION_NAME = os.getenv("COLLECTION_NAME")
USER_DOCUMENTS_COLLECTION_NAME = os.getenv("USER_DOCUMENTS_COLLECTION_NAME")


client: Optional[MongoClient] = None
db = None
schemes_collection = None
user_documents_collection = None

# Function to connect to MongoDB
def connect_to_mongodb():
    global client, db, schemes_collection, user_documents_collection
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        schemes_collection = db[COLLECTION_NAME]
        user_documents_collection = db[USER_DOCUMENTS_COLLECTION_NAME]
        client.admin.command('ping')
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        client = None

def get_db():
    if db is None:
        connect_to_mongodb()
    return db


# Function to get the MongoDB collection
def get_collection(collection: Collection = Collection.SCHEMES):
    collection_code_map= {Collection.SCHEMES: schemes_collection, Collection.USER_DOCUMENTS: user_documents_collection}
    if client is None or collection_code_map[collection] is None:
        connect_to_mongodb()
        if collection_code_map[collection] is None:
            raise Exception("Failed to connect to MongoDB collection.")
    return collection_code_map[collection]


S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "your-unique-s3-bucket-name-here")
S3_REGION = os.getenv("S3_REGION", "us-east-1") # Example: "us-west-2", "eu-central-1"
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "YOUR_AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "YOUR_AWS_SECRET_ACCESS_KEY")

s3_client_instance = None

def get_s3_client() -> tuple:
    """
    Initializes and returns a singleton AWS S3 client using boto3.
    Raises HTTPException if client initialization fails.
    Returns client, bucket, region
    """
    global s3_client_instance
    global S3_BUCKET_NAME
    global AWS_ACCESS_KEY_ID
    global AWS_SECRET_ACCESS_KEY
    global S3_REGION

    try:
        db= get_db()
        global_settings= None
        if db is not None:
            global_settings= db[Collection.GLOBAL_SETTINGS]
        else:
            raise Exception("no db")
        if global_settings is not None:
            conf= global_settings.find_one({"lkCode": "S3_CONFIGURATIONS"})
            if conf and 'description' in conf:
                keys= conf['description'].split(',')
                found= False
                for key in keys:
                    if "accessKey" in key:
                        print("setting accessKey to :", conf[key.split(':')[0]])
                        AWS_ACCESS_KEY_ID= conf[key.split(':')[0]]
                        found= True
                    if "secretKey" in key:
                        print("setting secretKey to :", conf[key.split(':')[0]])
                        AWS_SECRET_ACCESS_KEY= conf[key.split(':')[0]]
                        found= True
                    if "bucketName" in key:
                        print("setting bucket name to :", conf[key.split(':')[0]])
                        S3_BUCKET_NAME= conf[key.split(':')[0]]
                        found= True
                    if "region" in key:
                        print("setting region to :", conf[key.split(':')[0]])
                        S3_REGION= conf[key.split(':')[0]]
                        found= True
                if not found:
                    print("no accessKey and/or secretKey in conf keys")
                else:
                    print("success")
            else:
                print("no conf with s3 conf lkcode, or no description in such document")
        else:
            print("no global settings while init-ing s3")
    except Exception as e:
        print("While trying to find s3 conf in global settings", e)

    if s3_client_instance is None:
        try:
            s3_client_instance = boto3.client(
                "s3",
                region_name=S3_REGION,
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY
            )
            print("S3 client initialized successfully.")
        except Exception as e:
            print(f"Error initializing S3 client: {e}")
            raise Exception(
                "Could not initialize S3 client. Check AWS credentials and region."
            )
    return s3_client_instance, S3_BUCKET_NAME, S3_REGION
