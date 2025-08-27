#!/usr/bin/env python3
"""
Script to get dev user token
"""
import requests
import json

API_BASE = "http://localhost:8000/api"

def get_dev_token():
    """Get dev user token from the API"""
    try:
        payload = {
            "email": "dev@nemasystems.io",
            "password": "dev"
        }
        response = requests.post(
            f"{API_BASE}/dev/get-clerk-token",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        response.raise_for_status()
        data = response.json()
        return data.get("access_token")
    except Exception as e:
        print(f"❌ Error getting dev token: {e}")
        return None

if __name__ == "__main__":
    token = get_dev_token()
    if token:
        print(f"✅ Dev token: {token}")
        # Save token to file for other scripts
        with open("dev_token.txt", "w") as f:
            f.write(token)
        print("✅ Token saved to dev_token.txt")
    else:
        print("❌ Failed to get dev token")