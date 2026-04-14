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
const express_1 = __importDefault(require("express"));
const whatsappService_1 = __importDefault(require("../services/whatsappService"));
const router = express_1.default.Router();
router.get('/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        if (!schoolId)
            return res.status(400).json({ error: 'schoolId required' });
        const session = yield whatsappService_1.default.getSession(schoolId);
        res.json({
            status: (session === null || session === void 0 ? void 0 : session.status) || 'disconnected',
            phoneNumber: session === null || session === void 0 ? void 0 : session.phoneNumber,
            qrCode: session === null || session === void 0 ? void 0 : session.qrCode,
            errorMessage: session === null || session === void 0 ? void 0 : session.errorMessage
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/connect', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.body;
        if (!schoolId)
            return res.status(400).json({ error: 'schoolId required' });
        const result = yield whatsappService_1.default.connect(schoolId);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/disconnect', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.body;
        if (!schoolId)
            return res.status(400).json({ error: 'schoolId required' });
        yield whatsappService_1.default.disconnect(schoolId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
function sendWhatsAppMessage(schoolId, phoneNumber, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const delay = Math.random() * 10000 + 5000;
        yield new Promise(resolve => setTimeout(resolve, delay));
        return yield whatsappService_1.default.sendMessage(schoolId, phoneNumber, message);
    });
}
router.post('/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, phoneNumber, message } = req.body;
        const result = yield sendWhatsAppMessage(schoolId, phoneNumber, message);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
const node_cron_1 = __importDefault(require("node-cron"));
node_cron_1.default.schedule('* * * * *', () => __awaiter(void 0, void 0, void 0, function* () {
}));
exports.default = router;
//# sourceMappingURL=whatsapp.js.map