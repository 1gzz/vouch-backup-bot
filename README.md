# Vouch Backup Bot

A simple Discord bot for managing vouches and backing up vouch data. Built with discord.js.

## Features
- Set a vouch channel for your server
- Backup and restore vouch data
- Slash command support

## Setup

### Prerequisites
- Node.js v16.9.0 or higher

### Installation
1. Download this respository.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Configure your bot:
   - Edit `config.json` and fill in your bot token, client ID, guild ID, and admin ID.

### Running the Bot
You can start the bot by doing this in command prompt:
```sh
node index.js
```

## Configuration
Edit the `config.json` file:
```json
{
  "token": "YOUR_BOT_TOKEN",
  "clientId": "YOUR_BOT_CLIENT_ID",
  "guildId": "YOUR_GUILD_ID",
  "adminId": "YOUR_USER_ID"
}
```

## Commands
- `/vouchchannelset <channel>`: Set the vouch channel
- `/vouchbackup`: Backup vouch data
- `/vouchrestore`: Restore vouch data

## Disclaimer

**This project is no longer being updated. It may not work perfectly with the latest Discord API or dependencies, but the base functionality should still work.**