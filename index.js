import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} from '@whiskeysockets/baileys'

import Pino from 'pino'
import qrcode from 'qrcode-terminal'
import Groq from 'groq-sdk'
import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'
import { config } from 'dotenv';
config(); // Load .env file
/* ================= CONFIG ================= */

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CONFIG = {
    BOT_NAME: 'wbot',
    SESSION_DIR: path.join(__dirname, 'auth'),
    CONTACTS_FILE: path.join(__dirname, 'contacts.json'),
    MAX_MSG_LEN: 4000
}

// Load environment variables
import 'dotenv/config'

const GROQ_API_KEY = process.env.GROQ_API_KEY
if (!GROQ_API_KEY) {
    console.error(chalk.red.bold('\n❌ GROQ_API_KEY not found in .env file'))
    console.log(chalk.yellow('Please run: ./build.sh'))
    console.log(chalk.yellow('Or create .env file with: GROQ_API_KEY=your_key_here\n'))
    process.exit(1)
}

// Rest of your code remains the same...
/* ================= BANNER ================= */

function printBanner() {
    console.clear()
    console.log(chalk.cyan(`
    ╔══════════════════════════════════════════════════════╗
    ║                                                      ║
    ║  ${chalk.yellow('██╗    ██╗    ██████╗   ██████╗  ████████╗')}          ║
    ║  ${chalk.yellow('██║    ██║    ██╔══██╗ ██╔═══██╗ ╚══██╔══╝')}          ║
    ║  ${chalk.yellow('██║ █╗ ██║    ██████╔╝ ██║   ██║    ██║')}             ║
    ║  ${chalk.yellow('██║███╗██║    ██╔══██╗ ██║   ██║    ██║')}             ║
    ║  ${chalk.yellow('╚███╔███╔╝    ██████╔╝ ╚██████╔╝    ██║')}             ║
    ║  ${chalk.yellow(' ╚══╝╚══╝     ╚═════╝   ╚═════╝     ╚═╝')}             ║
    ║                                                      ║
    ║      ${chalk.green.bold('🚀 advanced WhatsApp AI bot')} ${chalk.yellow('v2.0')}                ║
    ║      ${chalk.cyan('        Created by AVDALLAH')}                     ║
    ║                                                      ║
    ╠══════════════════════════════════════════════════════╣
    ║                                                      ║
    ║  ${chalk.cyan('📌')} ${chalk.white('Model:')} ${chalk.yellow('llama-3.1-8b-instant')}           ║
    ║  ${chalk.cyan('🔑')} ${chalk.white('API Key:')} ${chalk.green('✓ Validated')}                 ║
    ║  ${chalk.cyan('💬')} ${chalk.white('Prefix:')} ${chalk.magenta('@')}${chalk.magenta.bold(CONFIG.BOT_NAME)}                    ║
    ║                                                      ║
    ╚══════════════════════════════════════════════════════╝\n`))
    
    console.log(chalk.gray('╭────────────────────────────────────────────────────╮'))
    console.log(chalk.gray('│') + chalk.white.bold('        TERMINAL COMMANDS                          ') + chalk.gray('│'))
    console.log(chalk.gray('├────────────────────────────────────────────────────┤'))
    console.log(chalk.gray('│') + chalk.cyan('  help') + chalk.gray('         Show all available commands      │'))
    console.log(chalk.gray('│') + chalk.cyan('  list') + chalk.gray('         List all saved contacts          │'))
    console.log(chalk.gray('│') + chalk.cyan('  select <n>') + chalk.gray('   Select contact by number          │'))
    console.log(chalk.gray('│') + chalk.cyan('  send <msg>') + chalk.gray('   Send message to selected contact  │'))
    console.log(chalk.gray('│') + chalk.cyan('  clear') + chalk.gray('        Clear terminal screen            │'))
    console.log(chalk.gray('│') + chalk.cyan('  status') + chalk.gray('       Show bot status                 │'))
    console.log(chalk.gray('│') + chalk.cyan('  restart') + chalk.gray('      Restart connection              │'))
    console.log(chalk.gray('│') + chalk.cyan('  exit') + chalk.gray('         Exit the application             │'))
    console.log(chalk.gray('╰────────────────────────────────────────────────────╯\n'))
}

/* ================= LOGGER ================= */

const log = {
    info: (m) => console.log(chalk.cyan('📦'), chalk.cyanBright(m)),
    ok: (m) => console.log(chalk.green('✅'), chalk.greenBright(m)),
    warn: (m) => console.log(chalk.yellow('⚠️ '), chalk.yellowBright(m)),
    err: (m) => console.log(chalk.red('❌'), chalk.redBright(m)),
    recv: (f, m) => console.log(chalk.blue('📩 ') + chalk.white.bold(f) + chalk.gray(': ') + chalk.white(m.slice(0, 120) + (m.length > 120 ? '...' : ''))),
    ai: (f, m) => console.log(chalk.magenta('🤖 ') + chalk.magenta.bold('[' + f + ']') + chalk.gray(' » ') + chalk.cyan(m.slice(0, 100) + (m.length > 100 ? '...' : ''))),
    send: (f, m) => console.log(chalk.green('📤 ') + chalk.green.bold('[' + f + ']') + chalk.gray(' ← ') + chalk.white(m.slice(0, 100) + (m.length > 100 ? '...' : '')))
}

/* ================= STATE ================= */

const state = {
    sock: null,
    contacts: {},
    activeChat: null,
    isConnecting: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10
}

if (fs.existsSync(CONFIG.CONTACTS_FILE)) {
    try {
        state.contacts = JSON.parse(fs.readFileSync(CONFIG.CONTACTS_FILE, 'utf8'))
        log.ok(`Loaded ${Object.keys(state.contacts).length} contacts`)
    } catch (e) {
        log.warn('Could not load contacts file')
    }
}

function saveContacts() {
    try {
        fs.writeFileSync(CONFIG.CONTACTS_FILE, JSON.stringify(state.contacts, null, 2))
    } catch (e) {
        log.err('Failed to save contacts')
    }
}

function normalizeJid(jid) {
    return jid?.split(':')[0]
}

/* ================= SAFE SEND ================= */

async function safeSend(jid, content) {
    if (!state.sock) return false
    try {
        await Promise.race([
            state.sock.sendMessage(jid, content),
            new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 12000))
        ])
        return true
    } catch {
        log.warn(`Send timeout → ${jid}`)
        return false
    }
}

/* ================= AI ================= */

const groq = new Groq({ apiKey: GROQ_API_KEY })

async function aiReply(prompt, name) {
    try {
        const r = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: `You are W-BOT, an advanced WhatsApp AI assistant created by AVDALLAH. Be helpful, concise, and friendly.` },
                { role: 'user', content: prompt }
            ],
            temperature: 0.6,
            max_tokens: 700
        })

        return r.choices[0]?.message?.content || '🤖 No response.'
    } catch (e) {
        return '🤖 I couldn\'t reply right now.'
    }
}

/* ================= WHATSAPP ================= */

async function startWA() {
    if (state.isConnecting) {
        log.warn('Already connecting to WhatsApp...')
        return
    }
    
    state.isConnecting = true
    log.info('Starting W-BOT WhatsApp AI...')

    try {
        const { state: auth, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR)
        const { version } = await fetchLatestBaileysVersion()

        const sock = makeWASocket({
            version,
            auth: {
                creds: auth.creds,
                keys: makeCacheableSignalKeyStore(auth.keys, Pino({ level: 'fatal' }))
            },
            logger: Pino({ level: 'fatal' }),
            browser: ['W-BOT AI', 'Chrome', '2.0'],
            printQRInTerminal: false,
            syncFullHistory: false,
            emitOwnEvents: false,
            defaultQueryTimeoutMs: 15000
        })

        state.sock = sock
        state.reconnectAttempts = 0

        sock.ev.on('creds.update', saveCreds)

        sock.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {
            if (qr) {
                console.log('\n' + chalk.bgBlack.white.bold(' 🔐 QR CODE REQUIRED '))
                console.log(chalk.gray('Scan this QR code with WhatsApp:'))
                console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
                qrcode.generate(qr, { small: true })
                console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
            }

            if (connection === 'open') {
                state.isConnecting = false
                state.reconnectAttempts = 0
                log.ok('WhatsApp connected successfully!')
                
                const userName = sock.user?.name || 'Unknown'
                const userId = sock.user?.id?.replace(/:\d+/, '') || 'Unknown'
                const currentTime = new Date().toLocaleTimeString()
                
                console.log(chalk.gray('╭─────────────────────────────────────────────╮'))
                console.log(chalk.gray('│') + chalk.white.bold('         CONNECTION STATUS                  ') + chalk.gray('│'))
                console.log(chalk.gray('├─────────────────────────────────────────────┤'))
                console.log(chalk.gray('│') + chalk.green('✅ Connected as: ') + chalk.cyan(userName) + chalk.gray('│'))
                console.log(chalk.gray('│') + chalk.cyan('📱 Number: ') + chalk.white(userId) + chalk.gray('│'))
                console.log(chalk.gray('│') + chalk.yellow('🕐 Time: ') + chalk.white(currentTime) + chalk.gray('│'))
                console.log(chalk.gray('╰─────────────────────────────────────────────╯\n'))
                
                // Reset terminal prompt
                if (rl) {
                    rl.prompt()
                }
            }

            if (connection === 'close') {
                state.isConnecting = false
                const code = lastDisconnect?.error?.output?.statusCode
                
                if (code === DisconnectReason.loggedOut) {
                    log.err('Logged out from WhatsApp. Please delete the auth folder and restart.')
                    process.exit(1)
                } else if (state.reconnectAttempts < state.maxReconnectAttempts) {
                    state.reconnectAttempts++
                    const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000)
                    log.warn(`Connection lost. Reconnecting in ${delay/1000}s... (Attempt ${state.reconnectAttempts}/${state.maxReconnectAttempts})`)
                    
                    setTimeout(() => {
                        if (state.sock) {
                            state.sock.end(undefined)
                            state.sock = null
                        }
                        startWA()
                    }, delay)
                } else {
                    log.err('Max reconnection attempts reached. Please restart the bot.')
                    process.exit(1)
                }
            }
        })

        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const m of messages) {
                if (!m.message || m.key.fromMe) continue

                const jid = m.key.remoteJid
                if (
                    jid.endsWith('@newsletter') ||
                    jid.includes('@broadcast') ||
                    jid === 'status@broadcast'
                ) return

                const text =
                    m.message.conversation ||
                    m.message.extendedTextMessage?.text

                if (!text) return

                const name = m.pushName || 'Unknown'
                const cleanJid = normalizeJid(jid)

                state.contacts[cleanJid] = {
                    jid: cleanJid,
                    name
                }
                saveContacts()

                log.recv(name, text)

                const isMention = text.toLowerCase().startsWith(`@${CONFIG.BOT_NAME}`)
                if (!isMention) return

                const prompt = text.replace(new RegExp(`^@${CONFIG.BOT_NAME}`, 'i'), '').trim()
                if (!prompt) {
                    await safeSend(jid, { text: `👋 Hello ${name}!\n\nI'm W-BOT, your AI assistant.\n\nMention me with @${CONFIG.BOT_NAME} followed by your question.\n\n- Created by AVDALLAH 🤖` })
                    return
                }

                log.ai(name, prompt)
                const reply = await aiReply(prompt, name)
                await safeSend(jid, { text: reply })
            }
        })

        // Handle errors
        sock.ev.on('connection.gain', () => {
            log.ok('Connection quality improved')
        })

        sock.ev.on('connection.lost', () => {
            log.warn('Connection quality degraded')
        })

    } catch (error) {
        state.isConnecting = false
        log.err(`Connection error: ${error.message}`)
        
        if (state.reconnectAttempts < state.maxReconnectAttempts) {
            state.reconnectAttempts++
            const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000)
            log.warn(`Will retry in ${delay/1000}s... (Attempt ${state.reconnectAttempts}/${state.maxReconnectAttempts})`)
            
            setTimeout(() => {
                startWA()
            }, delay)
        }
    }
}

/* ================= TERMINAL ================= */

let rl = null

function setupTerminal() {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    function showPrompt() {
        if (state.activeChat) {
            const contact = Object.values(state.contacts).find(c => c.jid === state.activeChat)
            process.stdout.write(chalk.magenta('🤖 ') + chalk.cyan(`[${contact?.name || 'Selected'}] `) + chalk.gray('→ ') + chalk.white(''))
        } else {
            process.stdout.write(chalk.magenta('🤖 ') + chalk.gray('→ ') + chalk.white(''))
        }
    }

    showPrompt()

    rl.on('line', async (line) => {
        const trimmed = line.trim()
        if (!trimmed) {
            showPrompt()
            return
        }

        const [cmd, ...args] = trimmed.split(' ')
        const rest = args.join(' ')

        switch (cmd.toLowerCase()) {
            case 'help':
                console.log(chalk.gray('\n╭────────────────────────────────────────────────────╮'))
                console.log(chalk.gray('│') + chalk.white.bold('        COMMAND REFERENCE                       ') + chalk.gray('│'))
                console.log(chalk.gray('├────────────────────────────────────────────────────┤'))
                console.log(chalk.gray('│') + chalk.cyan('help') + chalk.gray('           Show this help message            │'))
                console.log(chalk.gray('│') + chalk.cyan('list') + chalk.gray('           List all saved contacts          │'))
                console.log(chalk.gray('│') + chalk.cyan('select <number>') + chalk.gray(' Select contact by list number     │'))
                console.log(chalk.gray('│') + chalk.cyan('send <message>') + chalk.gray(' Send message to selected contact  │'))
                console.log(chalk.gray('│') + chalk.cyan('clear') + chalk.gray('          Clear terminal screen            │'))
                console.log(chalk.gray('│') + chalk.cyan('status') + chalk.gray('         Show bot connection status       │'))
                console.log(chalk.gray('│') + chalk.cyan('restart') + chalk.gray('        Restart WhatsApp connection      │'))
                console.log(chalk.gray('│') + chalk.cyan('exit / quit') + chalk.gray('    Exit the application             │'))
                console.log(chalk.gray('╰────────────────────────────────────────────────────╯\n'))
                break

            case 'list':
                const contactList = Object.values(state.contacts)
                if (contactList.length === 0) {
                    console.log(chalk.yellow('📭 No contacts saved yet. Message the bot first!\n'))
                } else {
                    console.log(chalk.cyan('\n📇 CONTACT LIST'))
                    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
                    contactList.forEach((contact, index) => {
                        const isActive = state.activeChat === contact.jid
                        console.log(
                            (isActive ? chalk.green('👉 ') : '   ') +
                            chalk.cyan(`${index + 1}. `) +
                            chalk.white.bold(contact.name) +
                            chalk.gray(' - ') +
                            chalk.dim(contact.jid) +
                            (isActive ? chalk.green(' [SELECTED]') : '')
                        )
                    })
                    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
                }
                break

            case 'select':
                const index = parseInt(args[0]) - 1
                const contacts = Object.values(state.contacts)
                if (isNaN(index) || index < 0 || index >= contacts.length) {
                    console.log(chalk.red('❌ Invalid contact number. Use "list" to see available contacts.\n'))
                } else {
                    state.activeChat = contacts[index].jid
                    console.log(chalk.green(`✅ Selected: ${chalk.white.bold(contacts[index].name)}\n`))
                }
                break

            case 'send':
                if (!state.activeChat) {
                    console.log(chalk.yellow('⚠️  Please select a contact first using: ') + chalk.cyan('select <number>\n'))
                } else if (!rest) {
                    console.log(chalk.red('❌ Please enter a message to send\n'))
                } else {
                    const contact = Object.values(state.contacts).find(c => c.jid === state.activeChat)
                    console.log(chalk.cyan(`📤 Sending to ${chalk.white.bold(contact?.name)}: ${chalk.gray(rest.slice(0, 50))}${rest.length > 50 ? '...' : ''}`))
                    await safeSend(state.activeChat, { text: rest })
                    console.log('')
                }
                break

            case 'clear':
                printBanner()
                break

            case 'status':
                const contactCount = Object.keys(state.contacts).length
                const activeContact = state.activeChat ? 
                    Object.values(state.contacts).find(c => c.jid === state.activeChat)?.name : 
                    'None'
                
                console.log(chalk.gray('\n╭─────────────────────────────────────────────╮'))
                console.log(chalk.gray('│') + chalk.white.bold('         W-BOT STATUS                    ') + chalk.gray('│'))
                console.log(chalk.gray('├─────────────────────────────────────────────┤'))
                console.log(chalk.gray('│') + chalk.cyan('🤖 Bot: ') + chalk.white('W-BOT v2.0') + chalk.gray('│'))
                console.log(chalk.gray('│') + chalk.cyan('👥 Contacts: ') + chalk.white(contactCount) + chalk.gray('│'))
                console.log(chalk.gray('│') + chalk.cyan('📱 Connected: ') + (state.sock?.user ? chalk.green('Yes') : chalk.red('No')) + chalk.gray('│'))
                console.log(chalk.gray('│') + chalk.cyan('💬 Active Chat: ') + (state.activeChat ? chalk.green(activeContact) : chalk.yellow('None')) + chalk.gray('│'))
                console.log(chalk.gray('│') + chalk.cyan('🔄 Reconnect Attempts: ') + chalk.white(state.reconnectAttempts) + chalk.gray('│'))
                console.log(chalk.gray('│') + chalk.cyan('👨‍💻 Creator: ') + chalk.yellow('AVDALLAH') + chalk.gray('│'))
                console.log(chalk.gray('╰─────────────────────────────────────────────╯\n'))
                break

            case 'restart':
                console.log(chalk.yellow('🔄 Restarting W-BOT connection...'))
                if (state.sock) {
                    state.sock.end(undefined)
                    state.sock = null
                }
                state.isConnecting = false
                state.reconnectAttempts = 0
                startWA()
                break

            case 'exit':
            case 'quit':
                console.log(chalk.green('\n👋 Goodbye! Shutting down W-BOT...'))
                if (state.sock) {
                    state.sock.end(undefined)
                }
                rl.close()
                process.exit(0)

            default:
                console.log(chalk.red(`❌ Unknown command: "${cmd}"`))
                console.log(chalk.yellow('Type "help" for available commands\n'))
        }

        showPrompt()
    })

    // Handle CTRL+C
    rl.on('SIGINT', () => {
        console.log(chalk.yellow('\n\n⚠️  Shutting down W-BOT...'))
        if (state.sock) {
            state.sock.end(undefined)
        }
        rl.close()
        process.exit(0)
    })
}

/* ================= START ================= */

printBanner()
setupTerminal()
startWA()

// Auto-reconnect check
setInterval(() => {
    if (state.sock && !state.isConnecting) {
        // Check if socket is still alive
        try {
            // You could add a ping or health check here
        } catch (error) {
            log.warn('Socket appears to be dead, attempting to reconnect...')
            if (state.sock) {
                state.sock.end(undefined)
                state.sock = null
            }
            state.isConnecting = false
            startWA()
        }
    }
}, 30000) // Check every 30 seconds
