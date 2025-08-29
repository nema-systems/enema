#!/usr/bin/env python3
"""
Script to create expanded submarine requirement trees with proper branching hierarchy
"""
import requests
import json
import time

# API configuration
API_BASE = "http://localhost:8000/api/v1"

# Load token from file
def load_token():
    try:
        with open("dev_token.txt", "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        print("❌ dev_token.txt not found. Run get_dev_token.py first.")
        return None

# Headers for API requests
def get_headers():
    token = load_token()
    if not token:
        return None
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

def create_requirement(workspace_id, name, definition, module_id, level, parent_id=None):
    """Create a requirement via API"""
    try:
        headers = get_headers()
        if not headers:
            return None
        payload = {
            "name": name,
            "definition": definition,
            "module_id": module_id,
            "level": level,
            "priority": "medium",
            "functional": "functional",
            "validation_method": "test",
            "status": "draft"
        }
        if parent_id:
            payload["parent_req_id"] = parent_id
            
        response = requests.post(
            f"{API_BASE}/workspaces/{workspace_id}/requirements",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()["data"]
    except Exception as e:
        print(f"❌ Error creating requirement '{name}': {e}")
        return None

# Expanded submarine requirement tree structures
# Note: These module IDs need to be updated based on actual module IDs in your workspace
SUBMARINE_REQUIREMENT_TREES = {
    1: {  # Hull & Structure module_id (update with actual module ID)
        "module_name": "Hull & Structure",
        "tree": {
            "L0": [
                {
                    "name": "Hull System",
                    "definition": "Overall hull system requirements for structural integrity and safety",
                    "children": {
                        "L1": [
                            {
                                "name": "Pressure Hull",
                                "definition": "Main pressure-resistant structure requirements",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Hull Materials", 
                                            "definition": "Material specifications for hull construction",
                                            "children": {
                                                "L3": [
                                                    {"name": "Steel Composition", "definition": "High-strength steel alloy requirements"},
                                                    {"name": "Titanium Components", "definition": "Titanium alloy specifications for critical components"},
                                                    {"name": "Composite Materials", "definition": "Advanced composite material requirements"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Hull Geometry",
                                            "definition": "Hull shape and structural design requirements", 
                                            "children": {
                                                "L3": [
                                                    {"name": "Cylindrical Sections", "definition": "Main cylindrical hull section specifications"},
                                                    {"name": "Conical Ends", "definition": "Bow and stern cone geometry requirements"},
                                                    {"name": "Hull Thickness", "definition": "Wall thickness specifications across hull sections"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "name": "Ballast System",
                                "definition": "Ballast tank and diving control system requirements",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Main Ballast Tanks",
                                            "definition": "Primary ballast tank specifications",
                                            "children": {
                                                "L3": [
                                                    {"name": "Tank Capacity", "definition": "Ballast tank volume and weight capacity"},
                                                    {"name": "Blow System", "definition": "High-pressure air blow system for surfacing"},
                                                    {"name": "Vent Valves", "definition": "Ballast tank venting valve specifications"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Trim Tanks",
                                            "definition": "Fine trim and buoyancy adjustment tanks",
                                            "children": {
                                                "L3": [
                                                    {"name": "Forward Trim", "definition": "Forward trim tank specifications"},
                                                    {"name": "Aft Trim", "definition": "Aft trim tank specifications"},
                                                    {"name": "Variable Ballast", "definition": "Variable ballast system for precise control"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "name": "Compartmentalization",
                                "definition": "Internal compartment structure and watertight integrity",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Watertight Bulkheads",
                                            "definition": "Structural bulkhead specifications for compartment separation",
                                            "children": {
                                                "L3": [
                                                    {"name": "Emergency Bulkheads", "definition": "Critical watertight bulkhead requirements"},
                                                    {"name": "Access Hatches", "definition": "Watertight hatch and door specifications"},
                                                    {"name": "Penetration Seals", "definition": "Cable and pipe penetration sealing requirements"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            ]
        }
    },
    2: {  # Propulsion System module_id (update with actual module ID)
        "module_name": "Propulsion System",
        "tree": {
            "L0": [
                {
                    "name": "Propulsion System",
                    "definition": "Complete submarine propulsion system requirements",
                    "children": {
                        "L1": [
                            {
                                "name": "Nuclear Reactor",
                                "definition": "Nuclear power plant requirements",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Reactor Core",
                                            "definition": "Nuclear fuel and control systems",
                                            "children": {
                                                "L3": [
                                                    {"name": "Fuel Assemblies", "definition": "Nuclear fuel element specifications"},
                                                    {"name": "Control Rods", "definition": "Neutron absorption control mechanisms"},
                                                    {"name": "Coolant System", "definition": "Primary coolant circulation requirements"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Steam Generator", 
                                            "definition": "Steam generation for turbine operation",
                                            "children": {
                                                "L3": [
                                                    {"name": "Heat Exchangers", "definition": "Primary to secondary heat transfer systems"},
                                                    {"name": "Steam Quality", "definition": "Steam pressure and temperature specifications"},
                                                    {"name": "Feedwater System", "definition": "Feedwater pump and treatment requirements"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "name": "Main Engine",
                                "definition": "Steam turbine and reduction gear system",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Steam Turbine",
                                            "definition": "Main propulsion turbine specifications",
                                            "children": {
                                                "L3": [
                                                    {"name": "High Pressure Stage", "definition": "HP turbine stage requirements"},
                                                    {"name": "Low Pressure Stage", "definition": "LP turbine stage requirements"},
                                                    {"name": "Turbine Blades", "definition": "Turbine blade material and geometry specs"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Reduction Gear",
                                            "definition": "Speed reduction gearbox for propeller",
                                            "children": {
                                                "L3": [
                                                    {"name": "Gear Ratios", "definition": "Speed reduction ratio specifications"},
                                                    {"name": "Gear Materials", "definition": "High-strength gear steel requirements"},
                                                    {"name": "Lubrication System", "definition": "Gear lubrication and cooling requirements"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "name": "Propeller System",
                                "definition": "Propeller and shaft system requirements",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Screw Propeller",
                                            "definition": "Main propeller specifications",
                                            "children": {
                                                "L3": [
                                                    {"name": "Blade Design", "definition": "Propeller blade geometry and pitch"},
                                                    {"name": "Hub Assembly", "definition": "Propeller hub and mounting requirements"},
                                                    {"name": "Cavitation Control", "definition": "Anti-cavitation design requirements"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Propeller Shaft",
                                            "definition": "Main shaft and bearing system",
                                            "children": {
                                                "L3": [
                                                    {"name": "Shaft Materials", "definition": "Propeller shaft material specifications"},
                                                    {"name": "Shaft Bearings", "definition": "Main shaft bearing requirements"},
                                                    {"name": "Stern Tube", "definition": "Stern tube and seal specifications"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            ]
        }
    },
    3: {  # Navigation & Control module_id (update with actual module ID)
        "module_name": "Navigation & Control",
        "tree": {
            "L0": [
                {
                    "name": "Navigation System",
                    "definition": "Complete navigation and control system requirements",
                    "children": {
                        "L1": [
                            {
                                "name": "Sonar System",
                                "definition": "Acoustic detection and ranging systems",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Active Sonar",
                                            "definition": "High-frequency active acoustic system",
                                            "children": {
                                                "L3": [
                                                    {"name": "Transducer Array", "definition": "Acoustic signal transmission array"},
                                                    {"name": "Signal Processing", "definition": "Active sonar signal processing requirements"},
                                                    {"name": "Range Calculation", "definition": "Target range and bearing calculation"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Passive Sonar",
                                            "definition": "Passive acoustic listening system",
                                            "children": {
                                                "L3": [
                                                    {"name": "Hydrophone Array", "definition": "Passive acoustic sensor array"},
                                                    {"name": "Noise Analysis", "definition": "Target signature analysis system"},
                                                    {"name": "Directional Finding", "definition": "Passive target bearing determination"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Towed Array",
                                            "definition": "Towed sonar array system",
                                            "children": {
                                                "L3": [
                                                    {"name": "Array Elements", "definition": "Towed array hydrophone specifications"},
                                                    {"name": "Deployment System", "definition": "Array deployment and recovery mechanism"},
                                                    {"name": "Cable Management", "definition": "Tow cable and signal transmission"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "name": "Periscope System", 
                                "definition": "Visual observation and electronic surveillance",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Optical Periscope",
                                            "definition": "Visual observation periscope",
                                            "children": {
                                                "L3": [
                                                    {"name": "Optical Train", "definition": "Periscope lens and mirror system"},
                                                    {"name": "Eyepiece System", "definition": "Operator viewing interface"},
                                                    {"name": "Elevation Mechanism", "definition": "Periscope raising and lowering system"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Electronic Periscope",
                                            "definition": "Electronic surveillance and communication",
                                            "children": {
                                                "L3": [
                                                    {"name": "ESM Sensors", "definition": "Electronic surveillance measures"},
                                                    {"name": "Radar Warning", "definition": "Radar detection and warning system"},
                                                    {"name": "Communication Arrays", "definition": "Radio communication antenna systems"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "name": "Navigation Sensors",
                                "definition": "Position and motion sensing systems",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Inertial Navigation",
                                            "definition": "Inertial navigation system requirements",
                                            "children": {
                                                "L3": [
                                                    {"name": "Gyroscopes", "definition": "Precision gyroscope specifications"},
                                                    {"name": "Accelerometers", "definition": "Linear acceleration sensors"},
                                                    {"name": "Navigation Computer", "definition": "Position calculation and display"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "GPS Receiver",
                                            "definition": "Global positioning system when surfaced",
                                            "children": {
                                                "L3": [
                                                    {"name": "GPS Antenna", "definition": "Satellite reception antenna"},
                                                    {"name": "Signal Processing", "definition": "GPS signal processing unit"},
                                                    {"name": "Position Display", "definition": "GPS position display and logging"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            ]
        }
    }
}

def get_workspace_id():
    """Get the first available workspace ID"""
    try:
        headers = get_headers()
        if not headers:
            return None
        response = requests.get(f"{API_BASE}/workspaces", headers=headers)
        response.raise_for_status()
        workspaces = response.json().get("data", [])
        if workspaces:
            return workspaces[0]["id"]
        else:
            print("❌ No workspaces found")
            return None
    except Exception as e:
        print(f"❌ Error fetching workspaces: {e}")
        return None

def create_requirement_tree(workspace_id, module_id, tree_node, level, parent_id=None):
    """Recursively create requirement tree"""
    created_requirements = []
    
    for req_data in tree_node:
        # Create the requirement
        requirement = create_requirement(
            workspace_id,
            req_data["name"],
            req_data["definition"],
            module_id,
            level,
            parent_id
        )
        
        if requirement:
            req_id = requirement["id"]
            public_id = requirement.get("public_id", "N/A")
            indent = "  " * (int(level[1]) + 1)
            print(f"{indent}✅ Created {level} requirement '{req_data['name']}' ({public_id}) with ID: {req_id}")
            created_requirements.append(requirement)
            
            # Create children if they exist
            if "children" in req_data:
                for child_level, child_nodes in req_data["children"].items():
                    child_requirements = create_requirement_tree(
                        workspace_id, module_id, child_nodes, child_level, req_id
                    )
                    created_requirements.extend(child_requirements)
        else:
            print(f"❌ Failed to create {level} requirement '{req_data['name']}'")
    
    return created_requirements

def expand_submarine_requirements():
    """Add expanded tree requirements to existing submarine modules"""
    print("🌳 Expanding Submarine Requirements into Tree Structures...")
    
    workspace_id = get_workspace_id()
    if not workspace_id:
        return
        
    print(f"✅ Using workspace ID: {workspace_id}")
    
    total_created = 0
    
    for module_id, module_data in SUBMARINE_REQUIREMENT_TREES.items():
        module_name = module_data["module_name"]
        print(f"\n🌿 Expanding {module_name} requirements...")
        
        # Create the tree starting from L0
        for level, nodes in module_data["tree"].items():
            requirements = create_requirement_tree(
                workspace_id, module_id, nodes, level
            )
            total_created += len(requirements)
        
        # Small delay between modules
        time.sleep(0.2)
    
    print(f"\n🎉 Submarine requirement trees expanded successfully!")
    print(f"📊 Created {total_created} additional requirements across {len(SUBMARINE_REQUIREMENT_TREES)} modules")

if __name__ == "__main__":
    expand_submarine_requirements()