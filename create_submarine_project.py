#!/usr/bin/env python3
"""
Script to create submarine project structure with hierarchical requirements
"""
import asyncio
import asyncpg
import json
from datetime import datetime

# Database connection settings
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "nema_dev",
    "user": "postgres",
    "password": "postgres"
}

# Submarine system modules structure
SUBMARINE_MODULES = {
    "Hull & Structure": {
        "description": "Structural integrity, pressure hull, ballast tanks, and compartmentalization",
        "requirements": {
            "L0": {"name": "Hull System", "desc": "Overall hull system requirements"},
            "L1": {"name": "Pressure Hull", "desc": "Main pressure-resistant structure"},
            "L2": {"name": "Hull Materials", "desc": "Material specifications for hull construction"},
            "L3": {"name": "Steel Composition", "desc": "High-strength steel alloy requirements"},
            "L4": {"name": "Welding Standards", "desc": "Welding procedures and quality standards"},
            "L5": {"name": "Weld Inspection", "desc": "Non-destructive testing procedures"}
        }
    },
    "Propulsion System": {
        "description": "Nuclear reactor, steam generation, turbine, and propeller systems",
        "requirements": {
            "L0": {"name": "Propulsion System", "desc": "Overall propulsion system requirements"},
            "L1": {"name": "Nuclear Reactor", "desc": "Nuclear power plant requirements"},
            "L2": {"name": "Reactor Core", "desc": "Nuclear fuel and control systems"},
            "L3": {"name": "Control Rods", "desc": "Neutron absorption control mechanisms"},
            "L4": {"name": "Rod Drive Mechanism", "desc": "Automated control rod positioning"},
            "L5": {"name": "Position Sensors", "desc": "Precise rod position monitoring"}
        }
    },
    "Navigation & Control": {
        "description": "Navigation, sonar, periscope, and steering control systems",
        "requirements": {
            "L0": {"name": "Navigation System", "desc": "Overall navigation and control requirements"},
            "L1": {"name": "Sonar System", "desc": "Acoustic detection and ranging"},
            "L2": {"name": "Active Sonar", "desc": "High-frequency active acoustic system"},
            "L3": {"name": "Transducer Array", "desc": "Acoustic signal transmission/reception"},
            "L4": {"name": "Hydrophone Elements", "desc": "Individual acoustic sensors"},
            "L5": {"name": "Sensor Calibration", "desc": "Acoustic sensitivity calibration"}
        }
    },
    "Life Support": {
        "description": "Air purification, oxygen generation, water treatment, and environmental control",
        "requirements": {
            "L0": {"name": "Life Support System", "desc": "Overall life support requirements"},
            "L1": {"name": "Atmospheric Control", "desc": "Air quality and pressure management"},
            "L2": {"name": "Oxygen Generation", "desc": "Electrolytic oxygen production"},
            "L3": {"name": "Electrolysis Unit", "desc": "Water splitting for oxygen production"},
            "L4": {"name": "Electrodes", "desc": "Conductive elements for electrolysis"},
            "L5": {"name": "Electrode Coating", "desc": "Corrosion-resistant surface treatment"}
        }
    },
    "Electrical Systems": {
        "description": "Power generation, distribution, batteries, and electrical safety systems",
        "requirements": {
            "L0": {"name": "Electrical System", "desc": "Overall electrical power requirements"},
            "L1": {"name": "Power Distribution", "desc": "Electrical power routing and control"},
            "L2": {"name": "Main Switchboard", "desc": "Primary electrical distribution panel"},
            "L3": {"name": "Circuit Breakers", "desc": "Overcurrent protection devices"},
            "L4": {"name": "Arc Detection", "desc": "Electrical arc fault detection"},
            "L5": {"name": "Current Sensors", "desc": "Real-time current measurement"}
        }
    },
    "Communications": {
        "description": "Radio, satellite, internal communications, and emergency systems",
        "requirements": {
            "L0": {"name": "Communications System", "desc": "Overall communication requirements"},
            "L1": {"name": "Radio Systems", "desc": "External radio communication capability"},
            "L2": {"name": "VLF Antenna", "desc": "Very low frequency antenna system"},
            "L3": {"name": "Antenna Elements", "desc": "Conductive antenna components"},
            "L4": {"name": "Wire Conductors", "desc": "Electrical conductivity specifications"},
            "L5": {"name": "Conductor Insulation", "desc": "Electrical insulation requirements"}
        }
    }
}

async def create_submarine_project():
    conn = await asyncpg.connect(**DB_CONFIG)
    
    try:
        # Get the first workspace (assuming it exists)
        workspace_row = await conn.fetchrow("SELECT id FROM workspace LIMIT 1")
        if not workspace_row:
            print("No workspace found. Please create a workspace first.")
            return
        
        workspace_id = workspace_row['id']
        print(f"Using workspace ID: {workspace_id}")
        
        # Create submarine product
        product_id = await conn.fetchval("""
            INSERT INTO product (workspace_id, name, description, created_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        """, workspace_id, "SSN Virginia Class Submarine", 
            "Nuclear-powered fast attack submarine designed for anti-submarine warfare, anti-surface warfare, strike warfare, special operations, intelligence gathering, and other missions",
            datetime.utcnow())
        
        print(f"Created submarine product with ID: {product_id}")
        
        # Create base requirement collection for the product
        base_req_collection_id = await conn.fetchval("""
            INSERT INTO req_collection (workspace_id, name, description, created_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        """, workspace_id, "Submarine Requirements", 
            "Main requirement collection for submarine project",
            datetime.utcnow())
        
        print(f"Created base requirement collection with ID: {base_req_collection_id}")
        
        # Create modules and their hierarchical requirements
        for module_name, module_data in SUBMARINE_MODULES.items():
            # Create module
            module_id = await conn.fetchval("""
                INSERT INTO module (workspace_id, name, description, shared, created_at)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            """, workspace_id, module_name, module_data["description"], False, datetime.utcnow())
            
            print(f"Created module '{module_name}' with ID: {module_id}")
            
            # Link module to product
            await conn.execute("""
                INSERT INTO product_module (product_id, module_id)
                VALUES ($1, $2)
            """, product_id, module_id)
            
            # Create requirement collection for this module
            req_collection_id = await conn.fetchval("""
                INSERT INTO req_collection (workspace_id, name, description, created_at)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            """, workspace_id, f"{module_name} Requirements", 
                f"Requirements for {module_name} module",
                datetime.utcnow())
            
            print(f"Created requirement collection for '{module_name}' with ID: {req_collection_id}")
            
            # Create hierarchical requirements L0-L5
            parent_req_id = None
            req_ids = {}
            
            for level in ["L0", "L1", "L2", "L3", "L4", "L5"]:
                req_data = module_data["requirements"][level]
                
                # Generate public_id
                public_id = f"{module_name[:3].upper()}-{level}-001"
                
                req_id = await conn.fetchval("""
                    INSERT INTO req (
                        workspace_id, req_collection_id, module_id,
                        name, definition, public_id, parent_id,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                """, workspace_id, req_collection_id, module_id,
                    req_data["name"], req_data["desc"], public_id, parent_req_id,
                    datetime.utcnow())
                
                print(f"  Created {level} requirement '{req_data['name']}' ({public_id}) with ID: {req_id}")
                
                req_ids[level] = req_id
                parent_req_id = req_id  # Next level will be child of current level
        
        print("\n✅ Submarine project created successfully!")
        print(f"- Product ID: {product_id}")
        print(f"- Base Requirement Collection ID: {base_req_collection_id}")
        print(f"- Created {len(SUBMARINE_MODULES)} modules")
        print(f"- Created {len(SUBMARINE_MODULES) * 6} requirements (L0-L5 for each module)")
        
    except Exception as e:
        print(f"❌ Error creating submarine project: {e}")
        raise
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(create_submarine_project())