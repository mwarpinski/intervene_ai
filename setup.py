#!/usr/bin/env python3
import os
import sys
import platform
import subprocess
import shutil

# Color formatting helper
def print_step(message):
    print(f"\n=====> {message} <=====")

def print_success(message):
    print(f"✓ {message}")

def print_error(message):
    print(f"✗ ERROR: {message}", file=sys.stderr)

def main():
    print_step("Intervene AI Cross-Platform Initializer")
    
    # 1. Detect OS
    os_type = platform.system()
    print(f"Detected Operating System: {os_type}")

    # 2. Check Python Version (Must be >= 3.10)
    py_version = sys.version_info
    print(f"Detected Python Version: {py_version.major}.{py_version.minor}.{py_version.micro}")
    if py_version.major < 3 or (py_version.major == 3 and py_version.minor < 10):
        print_error("Python 3.10 or higher is required to run the backend.")
        sys.exit(1)
    print_success("Python version check passed.")

    # 3. Check Node.js & npm Installation
    node_path = shutil.which("node")
    npm_path = shutil.which("npm")
    
    if not node_path or not npm_path:
        print_error("Node.js and npm are required to run the frontend.")
        print("Please download and install Node.js from https://nodejs.org/")
        sys.exit(1)
        
    try:
        node_ver = subprocess.check_output(["node", "--version"], text=True).strip()
        print_success(f"Node.js check passed: {node_ver}")
    except Exception as e:
        print_error(f"Failed to check Node.js version: {e}")
        sys.exit(1)

    # Define Workspace Paths
    base_dir = os.path.abspath(os.path.dirname(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")
    
    # 4. Initialize Backend Virtual Environment
    print_step("Setting up Backend Virtual Environment")
    venv_dir = os.path.join(backend_dir, "venv")
    
    # Choose correct pip and python paths based on OS
    if os_type == "Windows":
        pip_bin = os.path.join(venv_dir, "Scripts", "pip.exe")
        python_bin = os.path.join(venv_dir, "Scripts", "python.exe")
    else:
        pip_bin = os.path.join(venv_dir, "bin", "pip")
        python_bin = os.path.join(venv_dir, "bin", "python")

    # Create venv if not exists
    if not os.path.exists(venv_dir):
        print("Creating virtual environment...")
        try:
            subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
            print_success("Virtual environment created.")
        except subprocess.CalledProcessError as e:
            print_error(f"Failed to create virtual environment: {e}")
            sys.exit(1)
    else:
        print_success("Virtual environment already exists.")

    # Upgrade pip and install requirements
    print("Installing backend requirements.txt...")
    try:
        # Upgrade pip first
        subprocess.run([python_bin, "-m", "pip", "install", "--upgrade", "pip"], check=True)
        # Install requirements
        reqs_file = os.path.join(backend_dir, "requirements.txt")
        subprocess.run([pip_bin, "install", "-r", reqs_file], check=True)
        print_success("Backend dependencies installed successfully.")
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to install dependencies: {e}")
        sys.exit(1)

    # 5. Handle .env Setup
    env_example = os.path.join(backend_dir, ".env.example")
    env_file = os.path.join(backend_dir, ".env")
    if not os.path.exists(env_file):
        print("Creating default .env file from .env.example...")
        if os.path.exists(env_example):
            shutil.copy(env_example, env_file)
            print_success(".env created. Update it with your API keys if using LLMs.")
        else:
            with open(env_file, "w") as f:
                f.write("# Intervene AI API Keys\nGEMINI_API_KEY=\nANTHROPIC_API_KEY=\nOPENAI_API_KEY=\n")
            print_success("Created empty .env template.")
    else:
        print_success(".env file already exists.")

    # 6. Initialize Frontend Node Modules
    print_step("Setting up Frontend Node.js Dependencies")
    print("Running npm install in frontend...")
    try:
        # Determine shell usage based on OS (Windows requires shell=True for npm/npx resolving)
        use_shell = (os_type == "Windows")
        subprocess.run(["npm", "install"], cwd=frontend_dir, shell=use_shell, check=True)
        print_success("Frontend dependencies installed successfully.")
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to run npm install: {e}")
        sys.exit(1)

    print_step("Setup Completed Successfully!")
    print("\nTo start both backend and frontend servers with a single command, run:")
    if os_type == "Windows":
        print("  python run.py")
    else:
        print("  ./run.py   (or python3 run.py)")
    print("\nOpen http://localhost:5173/ in your browser once the servers have started.")

if __name__ == "__main__":
    main()
