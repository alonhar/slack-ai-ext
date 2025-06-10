#!/bin/bash

# Slack Patcher Script
# Description: Automates backing up, patching (injecting custom JS), and restoring Slack's app.asar.
# Usage:
#   ./slack_patcher.sh patch   - Applies the patch.
#   ./slack_patcher.sh restore - Restores Slack from backup.

# --- Configuration ---
# Detect OS and set appropriate Slack path
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    SLACK_APP_ASAR_PATH="/Applications/Slack.app/Contents/Resources/app.asar"
    echo "INFO: Detected macOS - using path: $SLACK_APP_ASAR_PATH"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    SLACK_APP_ASAR_PATH="/usr/lib/slack/resources/app.asar"
    echo "INFO: Detected Linux - using path: $SLACK_APP_ASAR_PATH"
else
    echo "ERROR: Unsupported operating system: $OSTYPE"
    echo "This script supports macOS and Linux only."
    exit 1
fi

WORKSPACE_DIR="$(pwd)" # Assumes script is run from its own directory

BACKUP_DIR="${WORKSPACE_DIR}/slack_backup"
TEMP_EXTRACT_DIR="${WORKSPACE_DIR}/slack_extracted_temp"
CUSTOM_JS_FILENAME="custom_slack_ext.js"
CUSTOM_JS_SOURCE_PATH="${WORKSPACE_DIR}/${CUSTOM_JS_FILENAME}"
MODIFIED_ASAR_TEMP_NAME="app.asar.modified" # Temporary name for the repacked asar

# --- Helper Functions ---
get_md5_checksum() {
  local file_path="$1"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS uses md5 command
    md5 -r "$file_path" | awk '{print $1}'
  else
    # Linux uses md5sum command
    md5sum "$file_path" | awk '{print $1}'
  fi
}

ensure_dir_exists() {
  if [ ! -d "$1" ]; then
    mkdir -p "$1" || { echo "ERROR: Could not create directory $1. Aborting."; exit 1; }
    echo "INFO: Ensured directory exists: $1"
  fi
}

check_asar_availability() {
  if ! command -v npx &> /dev/null; then
    echo "ERROR: npx command not found. Please install Node.js and npm."
    exit 1
  fi
  echo "INFO: npx found."
  # Attempt to get asar version via npx to confirm it can be fetched
  if ! npx asar --version &> /dev/null; then
    echo "ERROR: Failed to run 'npx asar --version'. Ensure npx can fetch and run asar."
    echo "You might need to run 'npm install -g asar' or check your network connection."
    exit 1
  fi
  echo "INFO: 'npx asar' seems available."
}

request_sudo_privileges() {
  if [[ $EUID -ne 0 ]]; then
    echo "INFO: This operation requires superuser (sudo) privileges."
    if ! sudo -v; then # Ask for password upfront and validate
      echo "ERROR: Sudo authentication failed. Aborting."
      exit 1
    fi
    echo "INFO: Sudo privileges obtained."
  else
    echo "INFO: Already running as root."
  fi
}

# --- Core Functions ---

backup_asar() {
  echo "INFO: --- Starting Backup ---"
  ensure_dir_exists "$BACKUP_DIR"

  local backup_file_path="${BACKUP_DIR}/app.asar.bak"
  local perform_backup=false

  if [ ! -f "$SLACK_APP_ASAR_PATH" ]; then
    echo "ERROR: Slack app.asar not found at '$SLACK_APP_ASAR_PATH'. Cannot proceed with backup."
    exit 1
  fi

  if [ ! -f "$backup_file_path" ]; then
    echo "INFO: No existing backup found. Creating new backup."
    perform_backup=true
  else
    # Compare checksums to see if Slack was updated
    local live_checksum
    live_checksum=$(get_md5_checksum "$SLACK_APP_ASAR_PATH")
    local backup_checksum
    backup_checksum=$(get_md5_checksum "$backup_file_path")

    if [ "$live_checksum" != "$backup_checksum" ]; then
      echo "INFO: Slack app.asar has changed (likely updated). Creating new backup."
      perform_backup=true
    else
      echo "INFO: Backup is up-to-date with the current Slack version. No new backup needed."
    fi
  fi

  if [ "$perform_backup" = true ]; then
    request_sudo_privileges
    echo "INFO: Backing up '$SLACK_APP_ASAR_PATH' to '$backup_file_path'..."
    if ! sudo cp "$SLACK_APP_ASAR_PATH" "$backup_file_path"; then
      echo "ERROR: Backup failed. Aborting."
      exit 1
    fi
    echo "INFO: Backup successful."
  fi
  echo "INFO: --- Backup Complete ---"
}

patch_slack() {
  echo "INFO: --- Starting Patch Process ---"

  # 1. Check for custom JS file
  if [ ! -f "$CUSTOM_JS_SOURCE_PATH" ]; then
    echo "ERROR: Custom JavaScript file not found at '$CUSTOM_JS_SOURCE_PATH'"
    echo "Please create this file with your Slack extension code in the same directory as this script."
    exit 1
  fi
  echo "INFO: Found custom JS file: '$CUSTOM_JS_SOURCE_PATH'"
  
  # Check for integrity script
  if [ ! -f "${WORKSPACE_DIR}/integrity.js" ]; then
    echo "ERROR: Integrity calculation script not found at '${WORKSPACE_DIR}/integrity.js'"
    exit 1
  fi

  # 2. Check asar availability
  check_asar_availability

  # 3. Perform backup (also checks if SLACK_APP_ASAR_PATH exists)
  backup_asar

  # 4. Calculate original checksum for macOS
  local old_checksum=""
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "INFO: [macOS] Calculating original asar integrity..."
    old_checksum=$(node "${WORKSPACE_DIR}/integrity.js" "$SLACK_APP_ASAR_PATH")
    if [ -z "$old_checksum" ]; then
        echo "ERROR: [macOS] Failed to calculate old checksum. Aborting."
        exit 1
    fi
    echo "INFO: [macOS] Original checksum: $old_checksum"
  fi

  # 5. Clean up old temp directory if it exists and create new one
  if [ -d "$TEMP_EXTRACT_DIR" ]; then
    echo "INFO: Removing old temporary extraction directory: '$TEMP_EXTRACT_DIR'"
    rm -rf "$TEMP_EXTRACT_DIR"
  fi
  ensure_dir_exists "$TEMP_EXTRACT_DIR"

  # 6. Extract app.asar
  echo "INFO: Extracting '$SLACK_APP_ASAR_PATH' to '$TEMP_EXTRACT_DIR'..."
  if ! npx asar extract "$SLACK_APP_ASAR_PATH" "$TEMP_EXTRACT_DIR"; then
    echo "ERROR: Failed to extract app.asar using npx. Aborting."
    rm -rf "$TEMP_EXTRACT_DIR" # Clean up
    exit 1
  fi
  echo "INFO: Extraction complete."

  # 7. Define paths for injection - target preload bundle that runs in renderer context
  local extracted_dist_path="${TEMP_EXTRACT_DIR}/dist"
  local target_bundle_name="preload.bundle.js" # Target preload that has some DOM access
  local target_bundle_path="${extracted_dist_path}/${target_bundle_name}"

  if [ ! -d "$extracted_dist_path" ]; then
    echo "ERROR: 'dist' directory not found at '$extracted_dist_path' after extraction."
    echo "Slack's internal structure might have changed. Aborting patch."
    rm -rf "$TEMP_EXTRACT_DIR" # Clean up
    exit 1
  fi

  if [ ! -f "$target_bundle_path" ]; then
    echo "ERROR: ${target_bundle_name} not found at '$target_bundle_path' after extraction."
    echo "Slack's internal structure might have changed. Aborting patch."
    rm -rf "$TEMP_EXTRACT_DIR" # Clean up
    exit 1
  fi
  echo "INFO: Found target bundle: '$target_bundle_path'"

  # 8. Copy custom JS and inject into target bundle
  echo "INFO: Reading custom JS file '$CUSTOM_JS_SOURCE_PATH'..."
  if [ ! -f "$CUSTOM_JS_SOURCE_PATH" ]; then
    echo "ERROR: Failed to find custom JS file. Aborting."
    rm -rf "$TEMP_EXTRACT_DIR" # Clean up
    exit 1
  fi

  # Check for OpenAI API key
  if [ -z "$OPENAI_API_KEY" ]; then
    echo "WARNING: OPENAI_API_KEY environment variable not set. AI features will not work."
    echo "INFO: To set it, run: export OPENAI_API_KEY='your-api-key-here'"
  else
    echo "INFO: OpenAI API key found in environment"
  fi

  echo "INFO: Inlining custom JS into '$target_bundle_path'..."
  # Add a newline before appending, just in case the original file doesn't end with one
  echo "" >> "$target_bundle_path"
  echo "// === CUSTOM SLACK EXTENSION START === (Added by slack_patcher)" >> "$target_bundle_path"
  
  # Inject the OpenAI API key as a global variable
  if [ -n "$OPENAI_API_KEY" ]; then
    echo "// Injected OpenAI API Key" >> "$target_bundle_path"
    echo "window.SLACK_EXTENSION_OPENAI_KEY = '$OPENAI_API_KEY';" >> "$target_bundle_path"
    echo "console.log('SLACK EXTENSION: OpenAI API key injected');" >> "$target_bundle_path"
  else
    echo "// No OpenAI API Key provided" >> "$target_bundle_path"
    echo "window.SLACK_EXTENSION_OPENAI_KEY = null;" >> "$target_bundle_path"
    echo "console.log('SLACK EXTENSION: No OpenAI API key - AI features disabled');" >> "$target_bundle_path"
  fi
  
  cat "$CUSTOM_JS_SOURCE_PATH" >> "$target_bundle_path"
  echo "" >> "$target_bundle_path"
  echo "// === CUSTOM SLACK EXTENSION END ===" >> "$target_bundle_path"
  echo "INFO: Injection attempt complete."

  # 9. Repack
  local modified_asar_output_path="${WORKSPACE_DIR}/${MODIFIED_ASAR_TEMP_NAME}"
  if [ -f "$modified_asar_output_path" ]; then
      echo "INFO: Removing old repacked asar: '$modified_asar_output_path'"
      rm -f "$modified_asar_output_path"
  fi
  echo "INFO: Packing '$TEMP_EXTRACT_DIR' to '$modified_asar_output_path'..."
  if ! npx asar pack "$TEMP_EXTRACT_DIR" "$modified_asar_output_path"; then
    echo "ERROR: Failed to pack modified directory using npx. Aborting."
    rm -rf "$TEMP_EXTRACT_DIR" # Clean up
    exit 1
  fi
  echo "INFO: Packing complete: '$modified_asar_output_path'"

  # 10. Apply
  request_sudo_privileges
  echo "INFO: Replacing live Slack app.asar with modified version..."
  if ! sudo cp "$modified_asar_output_path" "$SLACK_APP_ASAR_PATH"; then
    echo "ERROR: Failed to replace live app.asar. Aborting."
    rm -f "$modified_asar_output_path" # Clean up repacked file on error
    rm -rf "$TEMP_EXTRACT_DIR"    # Clean up extracted dir on error
    exit 1
  fi
  echo "SUCCESS: Patch applied successfully!"

  # NEW STEP: Update macOS plist checksums
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -z "$old_checksum" ]; then
        echo "WARNING: [macOS] Old checksum was not calculated, skipping Info.plist update."
    else
        echo "INFO: [macOS] Calculating new asar integrity..."
        local new_checksum
        new_checksum=$(node "${WORKSPACE_DIR}/integrity.js" "$SLACK_APP_ASAR_PATH")
        if [ -z "$new_checksum" ]; then
            echo "ERROR: [macOS] Failed to calculate new checksum. Aborting."
            exit 1
        fi
        echo "INFO: [macOS] New checksum: $new_checksum"

        if [ "$old_checksum" == "$new_checksum" ]; then
            echo "INFO: [macOS] Checksums are identical. No Info.plist update needed."
        else
            local slack_contents_dir
            slack_contents_dir=$(dirname "$(dirname "$SLACK_APP_ASAR_PATH")")
            
            echo "INFO: [macOS] Searching for and replacing checksum in Info.plist files..."
            
            local file_list
            # Need sudo to grep in system directories, redirect stderr to hide permission errors for files we can't access anyway
            file_list=$(sudo grep -r -l "$old_checksum" "$slack_contents_dir" 2>/dev/null)

            if [ -n "$file_list" ]; then
                echo "INFO: [macOS] Found files to update:"
                echo "$file_list" | while IFS= read -r file; do
                  echo "  - $file"
                done

                # Use xargs to pass file list to sed for replacement
                echo "$file_list" | sudo xargs -I{} sed -i '' "s|${old_checksum}|${new_checksum}|g" {}
                echo "INFO: [macOS] Info.plist checksum update complete."
            else
                echo "WARNING: [macOS] No Info.plist files found containing the old checksum. The application might not launch correctly."
            fi
        fi
    fi
  fi
  echo "INFO: Restart Slack to see changes."

  # 11. Cleanup
  echo "INFO: Cleaning up temporary files..."
  rm -f "$modified_asar_output_path"
  rm -rf "$TEMP_EXTRACT_DIR"
  echo "INFO: Cleanup complete."
  echo "INFO: --- Patch Process Complete ---"
}

restore_slack() {
  echo "INFO: --- Starting Restore Process ---"
  local backup_file_path="${BACKUP_DIR}/app.asar.bak"

  if [ ! -f "$backup_file_path" ]; then
    echo "ERROR: Backup file not found at '$backup_file_path'. Cannot restore."
    exit 1
  fi

  if [ ! -f "$SLACK_APP_ASAR_PATH" ]; then
    # This is not necessarily an error; Slack might be uninstalled.
    # The cp command will fail if the parent dir of SLACK_APP_ASAR_PATH doesn't exist.
    echo "WARNING: Live Slack app.asar not found at '$SLACK_APP_ASAR_PATH'."
    echo "Attempting to restore, but ensure Slack is installed and paths are correct."
  fi

  request_sudo_privileges
  echo "INFO: Restoring original Slack app.asar from '$backup_file_path' to '$SLACK_APP_ASAR_PATH'..."
  if ! sudo cp "$backup_file_path" "$SLACK_APP_ASAR_PATH"; then
    echo "ERROR: Failed to restore app.asar. Aborting."
    exit 1
  fi
  echo "SUCCESS: Restore successful! Restart Slack to see original version."
  echo "INFO: --- Restore Process Complete ---"
}

# --- Script Main Logic ---

if [ -z "$1" ] || ( [ "$1" != "patch" ] && [ "$1" != "restore" ] ); then
  echo "Usage: $0 [patch|restore]"
  echo "  patch   : Backs up (if needed), extracts, injects custom JS, repacks, and applies the patch."
  echo "  restore : Restores Slack to its original state from the last backup."
  exit 1
fi

# Check for checksum utility
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - check for md5 command
    if ! command -v md5 &> /dev/null; then
        echo "ERROR: 'md5' command not found. This script uses it to check for Slack updates."
        echo "The md5 command should be available by default on macOS."
        exit 1
    fi
else
    # Linux - check for md5sum command
    if ! command -v md5sum &> /dev/null; then
        echo "ERROR: 'md5sum' command not found. This script uses it to check for Slack updates."
        echo "Please install 'md5sum' (usually part of 'coreutils' package)."
        exit 1
    fi
fi

if [ "$1" = "patch" ]; then
  patch_slack
elif [ "$1" = "restore" ]; then
  restore_slack
fi

exit 0 