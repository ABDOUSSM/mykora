const express = require('express');
const mongoose = require('mongoose'); 
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. الاتصال بـ MongoDB ---
const mongoURI = "mongodb://benasabdou120_db_user:Ypubh6DSbuW1XYiD@ac-supyspj-shard-00-01.7jnmlrj.mongodb.net:27017/myStore?ssl=true&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ متصل بـ MongoDB بنجاح"))
    .catch(err => {
        console.log("❌ فشل الاتصال!");
        console.error(err);
    });

// --- 2. تعريف المخططات (Schemas) ---
const productSchema = new mongoose.Schema({
    name: String,
    price: String,
    image: String,
    description: String,
    quantity: { type: Number, default: 0 },
    colors: { type: String, default: '[]' }
});

const orderSchema = new mongoose.Schema({
    productId: String,
    productName: String,
    selectedColor: String,
    userName: String,
    phone: String,
    city: String,
    address: String,
    status: { type: String, default: 'قيد الانتظار' },
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// --- 3. نظام الحماية (Auth Middleware) ---
const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic');
        return res.status(401).send('Authentication required');
    }
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    if (credentials[0] === 'admin' && credentials[1] === '123456') {
        next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic');
        return res.status(401).send('Invalid credentials');
    }
};

// --- 4. المسارات (API Routes) ---

// حماية صفحة الأدمن (يجب أن يكون الملف admin.html بجانب server.js)
app.get('/admin.html', auth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html')); 
});

// الملفات العامة
app.use(express.static('public'));

// جلب المنتجات
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ _id: -1 });
        res.json(products);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// إضافة منتج (محمي)
const upload = multer({ dest: 'public/uploads/' });
app.post('/api/products', auth, upload.fields([{ name: 'image', maxCount: 1 }]), async (req, res) => {
    try {
        const { name, price, description, quantity } = req.body;
        const mainImage = req.files['image'] ? '/uploads/' + req.files['image'][0].filename : '';
        const newProduct = new Product({ name, price, description, quantity, image: mainImage });
        await newProduct.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// إرسال طلب
app.post('/api/order', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// جلب الطلبات (محمي)
app.get('/api/orders', auth, async (req, res) => {
    try {
        const orders = await Order.find().sort({ _id: -1 });
        res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// تحديث الحالة (محمي)
app.put('/api/orders/:id/status', auth, async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// حذف منتج (محمي)
app.delete('/api/products/:id', auth, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));