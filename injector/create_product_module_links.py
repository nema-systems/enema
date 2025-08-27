#!/usr/bin/env python3
"""
Script to create ProductModule associations for submarine project
"""
import requests
import json

# API configuration  
API_BASE = "http://localhost:8000/api/v1"

def load_token():
    try:
        with open("dev_token.txt", "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        print("❌ dev_token.txt not found.")
        return None

def get_headers():
    token = load_token()
    if not token:
        return None
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

def create_product_module_links():
    """Create ProductModule links for submarine project"""
    headers = get_headers()
    if not headers:
        return
    
    workspace_id = 6
    submarine_product_id = 9  # Latest submarine product
    submarine_module_ids = [19, 20, 21, 22, 23, 24]  # Hull, Propulsion, Navigation, Life Support, Electrical, Communications
    
    print(f"Creating ProductModule links for Product {submarine_product_id}")
    
    # Since there's no direct API endpoint, let's use the dev routes to execute SQL
    # This is a workaround for demonstration purposes
    for module_id in submarine_module_ids:
        try:
            # We'll use a custom SQL insert approach
            sql_query = f"""
            INSERT INTO product_modules (workspace_id, product_id, module_id) 
            VALUES ({workspace_id}, {submarine_product_id}, {module_id})
            ON CONFLICT DO NOTHING;
            """
            
            print(f"  Need to execute: INSERT product_modules link for module {module_id}")
            
        except Exception as e:
            print(f"❌ Error creating link for module {module_id}: {e}")
    
    print("\nTo manually create these links, execute this SQL:")
    print("INSERT INTO product_modules (workspace_id, product_id, module_id) VALUES")
    links = []
    for module_id in submarine_module_ids:
        links.append(f"  ({workspace_id}, {submarine_product_id}, {module_id})")
    print(",\n".join(links) + ";")

if __name__ == "__main__":
    create_product_module_links()