#!/bin/bash

echo "Do you want to clear cache before starting? (Y/N)"
read -r clear_cache

if [[ "${clear_cache}" == "Y" ]] || [[ "${clear_cache}" == "y" ]]; then
    cache_flag="--clear"
    echo "Cache will be cleared..."
else
    cache_flag=""
    echo "Starting without clearing cache..."
fi

sleep 1

# Open new Terminal windows for each app
osascript <<END
tell application "Terminal"
    -- Customer App
    do script "cd '$PWD/customer_app' && echo '🚀 Starting Customer App on port 8081...' && npx expo start --port 8081 ${cache_flag}"
    
    -- Wait a bit before starting the second app
    delay 2
    
    -- Rider App
    do script "cd '$PWD/rider_app' && echo '🏍️  Starting Rider App on port 8082...' && npx expo start --port 8082 ${cache_flag}"
    
    activate
end tell
END
