import { Client, GuildMember, Role } from 'discord.js-selfbot-v13';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// --- VERY IMPORTANT WARNING --- //
// Running a self-bot violates Discord's Terms of Service.
// Your account may be banned if detected.
// Use this code at your own risk.
// It is highly recommended to use bot accounts for proper automation.
// ---------------------------- //

// Define server IDs
const TARGET_SERVER_ID = '1281965480650735708'; // The server where the user joins
const CHECK_SERVER_ID = '1084098120515850241';  // The server to check for membership and roles

// --- Role Mapping --- //
// Map roles from CHECK_SERVER_ID (keys) to TARGET_SERVER_ID (values)
// Replace these placeholder IDs with your actual role IDs.
const ROLE_MAP: { [checkServerRoleId: string]: string } = {
'1127227742350483536': '1325432054237888554',
'1127227664273510430': '1325432054237888554',
// Add more mappings as needed
};
// --- End Role Mapping --- //

const client = new Client({
// checkUpdate: false, // Optional: disables checking for updates
});

client.on('ready', async () => {
if (!client.user) {
console.error("Client user is not available.");
return;
}
console.log(Logged in as ${client.user.tag} (ID: ${client.user.id}));
console.log('------');
console.log("WARNING: Running a self-bot violates Discord's ToS and can lead to account termination.");
console.log(Listening for members joining server ID: ${TARGET_SERVER_ID});
console.log(Will check for membership in server ID: ${CHECK_SERVER_ID});
console.log('Role Mapping configured.');
console.log('------');
});

client.on('guildMemberAdd', async (member: GuildMember) => {
// Ensure the member object is fully available
if (!member || !member.guild || !member.user) return;

// Check if the member joined the target server  
if (member.guild.id !== TARGET_SERVER_ID) {  
    return;  
}  
const targetGuild = member.guild;  

console.log(`${member.user.tag} (ID: ${member.user.id}) joined target server ${targetGuild.name} (ID: ${targetGuild.id})`);  

try {  
    // Get the second server (guild) object  
    const checkGuild = await client.guilds.fetch(CHECK_SERVER_ID);  
    if (!checkGuild) {  
        console.log(`  Error: Could not find the check server (ID: ${CHECK_SERVER_ID}). Make sure your account is in this server.`);  
        return;  
    }  

    // Attempt to fetch the member from the second server  
    try {  
        const checkMember = await checkGuild.members.fetch(member.user.id);  

        if (checkMember) {  
            console.log(`  ${member.user.tag} is also in ${checkGuild.name} (ID: ${checkGuild.id}). Checking roles...`);  

            const checkMemberRoles = checkMember.roles.cache;  
            let rolesToAdd: Role[] = [];  
            let rolesToAddNames: string[] = [];  

            // Find roles to add based on the map  
            checkMemberRoles.forEach(roleInCheckServer => {  
                const targetRoleId = ROLE_MAP[roleInCheckServer.id];  
                if (targetRoleId) {  
                    // Find the actual role object in the target server  
                    const targetRole = targetGuild.roles.cache.get(targetRoleId);  
                    if (targetRole) {  
                        // Check if the member already has the role in the target server  
                        if (!member.roles.cache.has(targetRole.id)) {  
                            rolesToAdd.push(targetRole);  
                            rolesToAddNames.push(targetRole.name);  
                        } else {  
                            console.log(`    - Member already has role '${targetRole.name}' in ${targetGuild.name}.`);  
                        }  
                    } else {  
                        console.log(`    - Warning: Mapped target role ID ${targetRoleId} not found in server ${targetGuild.name}.`);  
                    }  
                }  
            });  

            // Add the mapped roles if any were found  
            if (rolesToAdd.length > 0) {  
                console.log(`  Attempting to add roles in ${targetGuild.name}: ${rolesToAddNames.join(', ')}`);  
                try {  
                    await member.roles.add(rolesToAdd);  
                    console.log(`  Successfully added roles: ${rolesToAddNames.join(', ')}`);  
                } catch (addRoleError: any) {  
                    console.error(`  Error adding roles to ${member.user.tag} in ${targetGuild.name}.`);  
                    // Check for common permission error  
                    if (addRoleError.code === 50013) { // DiscordAPIError: Missing Permissions  
                         console.error(`  Reason: Missing 'Manage Roles' permission in ${targetGuild.name}.`);  
                    } else {  
                        console.error('  Add role error details:', addRoleError);  
                    }  
                }  
            } else {  
                console.log(`  No new roles to add based on the mapping and current roles.`);  
            }  

        } else {  
             console.log(`  ${member.user.tag} was NOT found in ${checkGuild.name} (ID: ${checkGuild.id}) (or couldn't be fetched).`);  
        }  
    } catch (fetchError) {  
         console.log(`  Could not fetch member ${member.user.tag} from ${checkGuild.name} (ID: ${checkGuild.id}). They might not be present, or self-bot permissions are restricted.`);  
    }  

} catch (guildError) {  
    console.log(`  Error fetching the check server (ID: ${CHECK_SERVER_ID}). Ensure the ID is correct and your account is in the server.`);  
}

});

// --- Login ---
const token = process.env.DISCORD_TOKEN;

if (!token) {
console.error("Error: DISCORD_TOKEN environment variable not set.");
console.error("Please ensure it is set in your environment or in a .env file.");
process.exit(1); // Exit if no token is provided
}

client.login(token)
.catch(error => {
console.error("Login failed. Check your token.");
console.error(error);
process.exit(1);
});

// Basic error handling
client.on('error', console.error);