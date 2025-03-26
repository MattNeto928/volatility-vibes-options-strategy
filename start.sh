#!/bin/bash

# Options Spread Strategy Setup and Start Script
# This script installs dependencies and starts both the Flask backend and React frontend

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "${BOLD}${BLUE}=== Options Spread Strategy Tool Setup ===${RESET}"
echo -e "${YELLOW}This script will set up and start both the backend and frontend servers.${RESET}\n"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required dependencies
echo -e "${BOLD}Checking system requirements...${RESET}"

# Check Python version
if command_exists python3; then
  PYTHON_VERSION=$(python3 --version | cut -d " " -f 2)
  echo -e "✓ Python detected: ${GREEN}$PYTHON_VERSION${RESET}"
  PYTHON_CMD="python3"
elif command_exists python; then
  PYTHON_VERSION=$(python --version | cut -d " " -f 2)
  echo -e "✓ Python detected: ${GREEN}$PYTHON_VERSION${RESET}"
  PYTHON_CMD="python"
else
  echo -e "${RED}❌ Python not found. Please install Python 3.9+ and try again.${RESET}"
  exit 1
fi

# Check Node.js
if command_exists node; then
  NODE_VERSION=$(node --version)
  echo -e "✓ Node.js detected: ${GREEN}$NODE_VERSION${RESET}"
else
  echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ and try again.${RESET}"
  exit 1
fi

# Check npm
if command_exists npm; then
  NPM_VERSION=$(npm --version)
  echo -e "✓ npm detected: ${GREEN}$NPM_VERSION${RESET}"
else
  echo -e "${RED}❌ npm not found. Please install npm and try again.${RESET}"
  exit 1
fi

# Setup the virtual environment
echo -e "\n${BOLD}Setting up Python virtual environment...${RESET}"

if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  $PYTHON_CMD -m venv venv
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create virtual environment. Please install venv package and try again.${RESET}"
    exit 1
  fi
else
  echo "Virtual environment already exists."
fi

# Activate the virtual environment
echo "Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  source venv/Scripts/activate
else
  source venv/bin/activate
fi

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to activate virtual environment.${RESET}"
  exit 1
fi

# Install Python dependencies
echo -e "\n${BOLD}Installing Python dependencies...${RESET}"
pip install -r requirements.txt

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to install Python dependencies.${RESET}"
  exit 1
else
  echo -e "${GREEN}✓ Python dependencies installed successfully.${RESET}"
fi

# Setup React frontend
echo -e "\n${BOLD}Setting up React frontend...${RESET}"
cd options-spread-ui || exit

echo "Installing npm packages..."
npm install

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to install npm packages.${RESET}"
  exit 1
else
  echo -e "${GREEN}✓ Node.js dependencies installed successfully.${RESET}"
fi

cd ..

# Check for .env file
echo -e "\n${BOLD}Checking for .env file...${RESET}"
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}⚠️ .env file not found. Creating a sample .env file.${RESET}"
  echo "PERPLEXITY_API_KEY=your_api_key_here" > .env
  echo -e "${YELLOW}⚠️ Please edit the .env file with your actual API keys before running the application.${RESET}"
else
  echo -e "${GREEN}✓ .env file found.${RESET}"
fi

# Instructions for running the application
echo -e "\n${BOLD}${GREEN}Setup complete!${RESET}"
echo -e "${BOLD}Starting servers...${RESET}"

# Function to handle termination
cleanup() {
  echo -e "\n${YELLOW}Shutting down servers...${RESET}"
  kill $FLASK_PID $REACT_PID 2>/dev/null
  exit 0
}

# Set up signal trap
trap cleanup SIGINT SIGTERM

# Start the Flask backend in the background
echo -e "\n${BOLD}Starting Flask backend...${RESET}"
$PYTHON_CMD server.py &
FLASK_PID=$!

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to start Flask server.${RESET}"
  exit 1
else
  echo -e "${GREEN}✓ Flask server started (PID: $FLASK_PID). Listening on http://localhost:5000${RESET}"
fi

# Give Flask a moment to start
sleep 2

# Start the React dev server in the background
echo -e "\n${BOLD}Starting React development server...${RESET}"
cd options-spread-ui
npm run dev &
REACT_PID=$!

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to start React development server.${RESET}"
  kill $FLASK_PID
  exit 1
else
  echo -e "${GREEN}✓ React development server started (PID: $REACT_PID).${RESET}"
fi

# Wait for user to press Ctrl+C
echo -e "\n${BOLD}${BLUE}Both servers are now running!${RESET}"
echo -e "${YELLOW}Open your browser and navigate to: ${BOLD}http://localhost:5173${RESET}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers.${RESET}"

# Wait for both background processes
wait $FLASK_PID $REACT_PID