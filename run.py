#!/usr/bin/env python3
import os
import sys
import platform
import subprocess
import time
import signal
import threading

def forward_stream(stream, prefix):
    """Reads lines from a subprocess stream and prints them with a prefix."""
    try:
        for line in iter(stream.readline, ''):
            if line:
                print(f"[{prefix}] {line.strip()}")
    except Exception:
        pass  # Stream closed on exit

def main():
    os_type = platform.system()
    base_dir = os.path.abspath(os.path.dirname(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")

    # Choose correct commands and python binary paths based on OS
    if os_type == "Windows":
        python_bin = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
        uvicorn_cmd = [python_bin, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"]
        npm_cmd = ["npm.cmd", "run", "dev"]
    else:
        python_bin = os.path.join(backend_dir, "venv", "bin", "python")
        uvicorn_cmd = [python_bin, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"]
        npm_cmd = ["npm", "run", "dev"]

    # Verify that setup has been run
    if not os.path.exists(python_bin):
        print(f"ERROR: Virtual environment not found at {python_bin}")
        print("Please run the setup script first: python3 setup.py")
        sys.exit(1)

    print("==================================================")
    print("Starting Intervene AI (Backend & Frontend)...")
    print("Press Ctrl+C to gracefully stop both servers.")
    print("==================================================")

    backend_proc = None
    frontend_proc = None

    try:
        # Start backend
        backend_proc = subprocess.Popen(
            uvicorn_cmd,
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        # Start frontend (using shell on Windows for resolving npm commands)
        use_shell = (os_type == "Windows")
        frontend_proc = subprocess.Popen(
            npm_cmd,
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            shell=use_shell
        )

        # Launch output forwarding threads
        b_thread = threading.Thread(target=forward_stream, args=(backend_proc.stdout, "Backend"), daemon=True)
        f_thread = threading.Thread(target=forward_stream, args=(frontend_proc.stdout, "Frontend"), daemon=True)
        b_thread.start()
        f_thread.start()

        # Let the processes run and monitor status
        while True:
            b_status = backend_proc.poll()
            f_status = frontend_proc.poll()

            if b_status is not None:
                print(f"\n[System] Backend exited with status {b_status}")
                break
            if f_status is not None:
                print(f"\n[System] Frontend exited with status {f_status}")
                break

            time.sleep(0.5)

    except KeyboardInterrupt:
        print("\n[System] Shutdown signal received. Stopping servers...")
    finally:
        # Terminate backend process
        if backend_proc and backend_proc.poll() is None:
            print("Stopping Backend...")
            try:
                if os_type == "Windows":
                    backend_proc.terminate()
                else:
                    backend_proc.send_signal(signal.SIGTERM)
                backend_proc.wait(timeout=3)
            except Exception:
                backend_proc.kill()

        # Terminate frontend process
        if frontend_proc and frontend_proc.poll() is None:
            print("Stopping Frontend...")
            try:
                if os_type == "Windows":
                    frontend_proc.terminate()
                else:
                    frontend_proc.send_signal(signal.SIGTERM)
                frontend_proc.wait(timeout=3)
            except Exception:
                frontend_proc.kill()

        print("[System] Both services stopped successfully.")

if __name__ == "__main__":
    main()
