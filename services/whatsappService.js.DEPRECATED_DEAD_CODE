"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = require("@whiskeysockets/baileys");
const pino_1 = __importDefault(require("pino"));
const WhatsAppSession_1 = __importDefault(require("../models/WhatsAppSession"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class WhatsAppService {
    constructor() {
        this.sockets = new Map();
    }
    getSession(schoolId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield WhatsAppSession_1.default.findOne({ schoolId });
        });
    }
    createOrUpdateSession(schoolId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield WhatsAppSession_1.default.findOneAndUpdate({ schoolId }, data, { upsert: true, new: true });
        });
    }
    connect(schoolId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const session = yield this.getSession(schoolId);
            if ((session === null || session === void 0 ? void 0 : session.status) === 'connected') {
                return { status: 'already_connected' };
            }
            if (this.sockets.has(schoolId)) {
                (_b = (_a = this.sockets.get(schoolId)) === null || _a === void 0 ? void 0 : _a.end) === null || _b === void 0 ? void 0 : _b.call(_a);
                this.sockets.delete(schoolId);
            }
            try {
                const { state, saveCreds } = yield (0, baileys_1.useMultiFileAuthState)(path_1.default.join(__dirname, `../auth/${schoolId}`));
                const { version } = yield (0, baileys_1.fetchLatestBaileysVersion)();
                const sock = (0, baileys_1.makeWASocket)({
                    version,
                    auth: {
                        creds: state.creds,
                        keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, (0, pino_1.default)({ level: 'silent' }))
                    },
                    printQRInTerminal: false,
                    logger: (0, pino_1.default)({ level: 'silent' }),
                    browser: ['School LMS', 'Chrome', '1.0.0']
                });
                this.sockets.set(schoolId, sock);
                sock.ev.on('connection.update', (update) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c, _d;
                    const { connection, lastDisconnect, qr } = update;
                    if (qr) {
                        yield this.createOrUpdateSession(schoolId, { qrCode: qr, status: 'connecting' });
                    }
                    if (connection === 'close') {
                        const shouldReconnect = ((_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !== baileys_1.DisconnectReason.loggedOut;
                        const status = shouldReconnect ? 'disconnected' : 'error';
                        yield this.createOrUpdateSession(schoolId, {
                            status,
                            errorMessage: shouldReconnect ? undefined : 'Logged out'
                        });
                        if (shouldReconnect) {
                            setTimeout(() => this.connect(schoolId), 5000);
                        }
                        else {
                            this.sockets.delete(schoolId);
                        }
                    }
                    else if (connection === 'open') {
                        const phoneNumber = (_d = (_c = sock.user) === null || _c === void 0 ? void 0 : _c.id) === null || _d === void 0 ? void 0 : _d.split('@')[0];
                        yield this.createOrUpdateSession(schoolId, {
                            status: 'connected',
                            phoneNumber,
                            qrCode: undefined
                        });
                    }
                }));
                sock.ev.on('creds.update', saveCreds);
                sock.ev.on('messages.upsert', (m) => __awaiter(this, void 0, void 0, function* () {
                }));
                return { status: 'connecting' };
            }
            catch (error) {
                yield this.createOrUpdateSession(schoolId, {
                    status: 'error',
                    errorMessage: error.message
                });
                return { status: 'error', qrCode: undefined };
            }
        });
    }
    disconnect(schoolId) {
        return __awaiter(this, void 0, void 0, function* () {
            const socket = this.sockets.get(schoolId);
            if (socket) {
                socket.end();
                this.sockets.delete(schoolId);
            }
            const authDir = path_1.default.join(__dirname, `../auth/${schoolId}`);
            if (fs_1.default.existsSync(authDir)) {
                fs_1.default.rmSync(authDir, { recursive: true, force: true });
            }
            yield WhatsAppSession_1.default.findOneAndDelete({ schoolId });
        });
    }
    sendMessage(schoolId, phoneNumber, message) {
        return __awaiter(this, void 0, void 0, function* () {
            const socket = this.sockets.get(schoolId);
            if (!socket) {
                return { success: false, error: 'WhatsApp not connected' };
            }
            try {
                const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
                yield socket.sendMessage(jid, { text: message });
                return { success: true };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        });
    }
    getSocket(schoolId) {
        return this.sockets.get(schoolId);
    }
}
exports.default = new WhatsAppService();
//# sourceMappingURL=whatsappService.js.map