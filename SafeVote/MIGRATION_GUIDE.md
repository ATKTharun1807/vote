# 🚀 SafeVote MongoDB Atlas Migration Guide

Follow these steps to complete your migration to MongoDB Atlas.

## 1. Get MongoDB Atlas Connection String
1.  Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  Create a **cluster** (the free tier works great).
3.  Click **Connect** -> **Drivers** -> **Node.js**.
4.  Copy the connection string (it looks like `mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/...`).

## 2. Setup Your Environment
Create a file named `.env` in the root folder (`SafeVote/`) and paste your connection string:
```env
MONGODB_URI=your_actual_connection_string_here
PORT=8081
```
*Note: Replace `<password>` with your actual database user password.*

## 3. Install Dependencies
Open your terminal in the `SafeVote` folder and run:
```cmd
npm install
```

## 4. Run the Server
Start your new Express + MongoDB server:
```cmd
npm start
```
Your app will be running at `http://localhost:8081`.

## What changed?
- **Backend**: We replaced the simple static server with a full **Express + Mongoose** backend.
- **Database**: All data (Candidates, Students, Votes, Config) is now stored in **MongoDB Atlas** instead of Firebase.
- **Security**: You can now manage students dynamicallly through the database.
- **Speed**: The app now uses persistent connections to your Atlas cluster.
