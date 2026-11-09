const express = require('express');
const app = express();
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const session = require('express-session');
const pdf = require('html-pdf');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.use(session({
    secret: '992547',
    resave: false,
    saveUninitialized: true
}));

// ----Header bar-----
app.get('/header', (req, res) => {
    const user = req.session.user;

    res.render('header', { user });
});

// ---เปิดหน้าเว็บ Login----
app.get('/login', (req, res) => {
    res.render('login');
});

// ---เปิดหน้าเว็บ home----
app.get('/home', (req, res) => {
    // res.render('home');
    res.render("home", { user: req.session.user });
});

// ---เปิดหน้าฟอร์มลงทะเบียน----
app.get('/register', (req, res) => {
    res.render('register', { users: [] });
});

// ---เปิดหน้ารีพอร์ต----
app.get('/reports', (req, res) => {
    res.render('reports', { herbReports: [] });
});
// app.get('/reports', (req, res) => {
//     res.render('reports', { 
//         herbReports: [], 
//         user: req.session.user || null  // ส่งตัวแปร user ไปที่ reports.ejs
//     });
// });


// ----Header หลังบ้าน-----
app.get('/admin/adminHd', (req, res) => {
    res.render('admin/adminHd');
});

// ----Header1-----
app.get('/header1', (req, res) => {
    const user = req.session.user;

    res.render('header1', { user });
});

// ----Header หลังบ้าน-----
app.get('/adminHd1', (req, res) => {
    res.render('adminHd1');
});


// ---เชื่อมต่อฐานข้อมูล-----
const connect = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'herbs'
});

connect.getConnection((err, connection) => {
    if (err) {
        console.error('ไม่สามารถเชื่อมต่อฐานข้อมูลได้:', err);
    } else {
        console.log('เชื่อมต่อฐานข้อมูลสำเร็จ');
        connection.release();
    }
});

// ----ทดลองหน้าแรก-----
app.get('/', (req, res) => {
    res.send("ยินดีต้อนรับเข้าสู่ Node js");
});

//----หน้าล็อกอิน----
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    connect.getConnection((err, connect) => {
        if (err) {
            console.log(err);
            return;
        }
        if (!username || !password) {
            return res.send('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
        }
        console.log(username);
        connect.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, rows) => {
            connect.release();
            if (err) {
                console.error('เกิดข้อผิดพลาดในการค้นหาผู้ใช้:', err);
                return res.render('login', { error: 'เกิดข้อผิดพลาดในการค้นหาผู้ใช้' });
            }
            if (rows.length > 0) {
                req.session.user = rows[0];
                const role = rows[0].role;
                if (role === 'แอดมิน') {
                    return res.json({ mes: 'ok', redirect: '/admin/adminHd' });
                } else {
                    return res.json({ mes: 'ok', redirect: '/home', user: rows[0] });
                }
            } else {
                res.json({ mes: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
            }
        });
    });
});



app.get('/admin/adminHd', (req, res) => {
    if (!req.session.users || req.session.users.role !== 'แอดมิน') {
        return res.redirect('/login');
    }
    res.render('admin/adminHd', { users: req.session.users });
});



// ---สมัครสมาชิก----
app.post('/register', (req, res) => {
    const { username, password, fname, lname, email, phone, province, amphure, sub_dis, zip_code, role } = req.body;

    if (!username || !password) {
        return res.render('register', { error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    connect.query('SELECT * FROM users WHERE username = ?', [username], (err, rows) => {
        if (err) {
            console.error('เกิดข้อผิดพลาดในการตรวจสอบชื่อผู้ใช้:', err);
            return res.render('register', { error: 'เกิดข้อผิดพลาดในการตรวจสอบชื่อผู้ใช้' });
        }

        if (rows.length > 0) {
            return res.render('register', { error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
        }

        connect.query(
            'INSERT INTO users (username, password, fname, lname, email, phone, province, amphure, sub_dis, zip_code, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?,?,?,?)',
            [username, password, fname, lname, email, phone, province, amphure, sub_dis, zip_code, role],
            (err) => {
                if (err) {
                    console.error('เกิดข้อผิดพลาดในการลงทะเบียนผู้ใช้:', err);
                    return res.render('register', { error: 'เกิดข้อผิดพลาดในการลงทะเบียนผู้ใช้' });
                }

                res.render('login', { success: 'สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ' });
            }
        );
    });
});



//----หน้าคอมเม้น----
app.get('/comment', (req, res) => {
    connect.getConnection((err, connection) => {
        if (err) {
            console.log(err);
            return;
        }

        const sql = `SELECT c.commentid, c.commentText, c.created_at AS com_date, c.userid AS comment_userid,
            u.fname, u.lname, u.role, 
            r.replyid, r.replyText, r.replyDate AS reply_date, r.userid AS reply_userid,
            ur.fname AS reply_fname, ur.lname AS reply_lname, ur.role AS reply_role
            FROM herbcomments c 
            LEFT JOIN users u ON c.userid = u.userid
            LEFT JOIN reply r ON c.commentid = r.commentid
            LEFT JOIN users ur ON r.userid = ur.userid
            ORDER BY c.created_at DESC, r.replyDate DESC`;

        connection.query(sql, (err, result) => {
            connection.release();
            if (err) {
                console.log(err);
                return;
            }

            let groupedComments = {};
            result.forEach(row => {
                if (!groupedComments[row.commentid]) {
                    groupedComments[row.commentid] = {
                        commentid: row.commentid,
                        commentText: row.commentText,
                        created_at: row.com_date,
                        userid: row.comment_userid,
                        fname: row.fname,
                        lname: row.lname,
                        role: row.role,
                        replies: []
                    };
                }

                if (row.replyid) {
                    groupedComments[row.commentid].replies.push({
                        replyid: row.replyid,
                        replyText: row.replyText,
                        replyDate: row.reply_date,
                        userid: row.reply_userid,
                        fname: row.reply_fname,
                        lname: row.reply_lname,
                        role: row.reply_role
                    });
                }
            });

            const comments = Object.values(groupedComments);
            res.render('comment', { comments: comments, user: req.session.user });
        });
    });
});



//----เพิ่มคอมเมนต์ใหม่----
app.post('/comment', (req, res) => {
    const { commentText, userid } = req.body;

    if (!commentText) {
        console.error('ข้อมูลไม่ครบ:', req.body);
        return res.status(400).send('กรุณากรอกข้อความคอมเมนต์');
    }

    if (!userid) {
        console.error('ไม่มี userid ในคำขอ');
        return res.status(400).send('ไม่พบข้อมูลผู้ใช้');
    }

    connect.query(
        'INSERT INTO herbcomments (commentText, created_at, userid) VALUES (?, ?, ?)',
        [commentText, new Date(), userid],
        (err) => {
            if (err) {
                console.error('เกิดข้อผิดพลาดในการเพิ่มคอมเมนต์:', err);
                return res.status(500).send('เกิดข้อผิดพลาดในการเพิ่มคอมเมนต์');
            }

            console.log('เพิ่มคอมเมนต์สำเร็จ');
            res.status(201).redirect('/comment');
        }
    );
});



//----เพิ่มการตอบกลับคอมเมนต์----
app.post('/reply', (req, res) => {
    const { userid, commentid, text, date } = req.body;

    if (!text) {
        return res.send('กรุณากรอกข้อความ');
    }

    connect.getConnection((err, connection) => {
        if (err) {
            console.log(err);
            return;
        }

        const sql = 'INSERT INTO reply (commentid, userid, replyText, replyDate) VALUES (?, ?, ?, ?)';
        const values = [commentid, userid, text, new Date(date)];

        connection.query(sql, values, (err, result) => {
            connection.release();
            if (err) {
                console.log(err);
                return;
            }
            res.json({ mes: 'ok' });
        });
    });
});



//----แก้ไขคอมเม้น----
app.post('/comment/edit', (req, res) => {
    const { commentid, newText } = req.body;
    const user = req.session.user;

    if (!user) {
        return res.status(401).send('กรุณาเข้าสู่ระบบ');
    }

    connect.query('SELECT userid FROM herbcomments WHERE commentid = ?', [commentid], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(500).send('เกิดข้อผิดพลาด');
        }

        if (rows[0].userid !== user.userid) {
            return res.status(403).send('คุณไม่มีสิทธิ์แก้ไขความคิดเห็นนี้');
        }

        connect.query('UPDATE herbcomments SET commentText = ? WHERE commentid = ?', [newText, commentid], (err) => {
            if (err) {
                return res.status(500).send('เกิดข้อผิดพลาดในการแก้ไขความคิดเห็น');
            }
            res.send({ success: true });
        });
    });
});


//----ลบคอมเม้น----
app.post('/comment/delete', (req, res) => {
    const { commentid } = req.body;
    const user = req.session.user;

    if (!user) {
        return res.status(401).send('กรุณาเข้าสู่ระบบ');
    }

    connect.query('SELECT userid FROM herbcomments WHERE commentid = ?', [commentid], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(500).send('เกิดข้อผิดพลาด');
        }

        if (rows[0].userid !== user.userid && user.role !== 'แอดมิน') {
            return res.status(403).send('คุณไม่มีสิทธิ์ลบความคิดเห็นนี้');
        }

        connect.query('DELETE FROM herbcomments WHERE commentid = ?', [commentid], (err) => {
            if (err) {
                return res.status(500).send('เกิดข้อผิดพลาดในการลบความคิดเห็น');
            }
            res.send({ success: true });
        });
    });
});


//----ลบรีพาย----
app.post('/reply/delete', (req, res) => {
    const { replyid } = req.body;
    const user = req.session.user;

    if (!user) {
        return res.status(401).send('กรุณาเข้าสู่ระบบ');
    }

    connect.query('SELECT userid FROM reply WHERE replyid = ?', [replyid], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(500).send('เกิดข้อผิดพลาด');
        }

        if (rows[0].userid !== user.userid && user.role !== 'แอดมิน') {
            return res.status(403).send('คุณไม่มีสิทธิ์ลบการตอบกลับนี้');
        }

        connect.query('DELETE FROM reply WHERE replyid = ?', [replyid], (err) => {
            if (err) {
                return res.status(500).send('เกิดข้อผิดพลาดในการลบการตอบกลับ');
            }
            res.send({ success: true });
        });
    });
});



//----แก้ไขข้อความตอบกลับคอมเมนต์----
app.post('/reply/edit', (req, res) => {
    const { replyid, newText } = req.body;
    const user = req.session.user;

    if (!user) {
        return res.status(401).send('กรุณาเข้าสู่ระบบ');
    }

    connect.query('SELECT userid FROM reply WHERE replyid = ?', [replyid], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(500).send('เกิดข้อผิดพลาดในการค้นหาข้อมูลรีพาย');
        }

        if (rows[0].userid !== user.userid) {
            return res.status(403).send('คุณไม่มีสิทธิ์แก้ไขการตอบกลับนี้');
        }

        connect.query('UPDATE reply SET replyText = ? WHERE replyid = ?', [newText, replyid], (err) => {
            if (err) {
                return res.status(500).send('เกิดข้อผิดพลาดในการแก้ไขการตอบกลับ');
            }
            res.send({ success: true });
        });
    });
});



// ----หน้ารายงานความคิดเห็นและการตอบกลับ---- 
app.get('/admin/comments', (req, res) => {
    const user = req.session.user;
    connect.getConnection((err, connection) => {
        if (err) {
            console.log(err);
            return;
        }

        const sql = `SELECT c.commentid, c.commentText, c.created_at AS com_date, c.userid AS comment_userid,
            u.fname, u.lname, u.role, 
            r.replyid, r.replyText, r.replyDate AS reply_date, r.userid AS reply_userid,
            ur.fname AS reply_fname, ur.lname AS reply_lname, ur.role AS reply_role
            FROM herbcomments c 
            JOIN users u ON c.userid = u.userid
            LEFT JOIN reply r ON c.commentid = r.commentid
            LEFT JOIN users ur ON r.userid = ur.userid
            ORDER BY c.created_at DESC, r.replyDate DESC`;

        connection.query(sql, (err, result) => {
            connection.release();
            if (err) {
                console.log(err);
                return;
            }

            let groupedComments = {};
            result.forEach(row => {
                if (!groupedComments[row.commentid]) {
                    groupedComments[row.commentid] = {
                        commentid: row.commentid,
                        commentText: row.commentText,
                        created_at: row.com_date,
                        userid: row.comment_userid,
                        fname: row.fname,
                        lname: row.lname,
                        role: row.role,
                        replies: []
                    };
                }

                if (row.replyid) {
                    groupedComments[row.commentid].replies.push({
                        replyid: row.replyid,
                        replyText: row.replyText,
                        replyDate: row.reply_date,
                        userid: row.reply_userid,
                        fname: row.reply_fname,
                        lname: row.reply_lname,
                        role: row.reply_role
                    });
                }
            });

            const comments = Object.values(groupedComments);
            res.render('admin/comments', { comments: comments, user: user });
        });
    });
});



// ----หน้ารายงานสมุนไพร----
app.get('/generate-report', async (req, res) => {
    const category = req.query.category || 'all';
    const subcategory = req.query.subcategory || 'all';
    let reports = [];

    try {
        const connectionPromise = connect.promise();
        let query = `
            SELECT herbs.*, category.ctgname, subcategory.subctgname
            FROM herbs
            JOIN category ON herbs.ctgid = category.ctgid
            LEFT JOIN subcategory ON herbs.subctgid = subcategory.subctgid
        `;
        let params = [];

        if (category !== 'all' && subcategory !== 'all') {
            query += ` WHERE herbs.ctgid = (SELECT ctgid FROM category WHERE ctgname = ?) 
                       AND herbs.subctgid = (SELECT subctgid FROM subcategory WHERE subctgname = ?)`;
            params.push(category, subcategory);
        } else if (category !== 'all') {
            query += ` WHERE herbs.ctgid = (SELECT ctgid FROM category WHERE ctgname = ?)`;
            params.push(category);
        } else if (subcategory !== 'all') {
            query += ` WHERE herbs.subctgid = (SELECT subctgid FROM subcategory WHERE subctgname = ?)`;
            params.push(subcategory);
        }

        const [rows] = await connectionPromise.query(query, params);
        reports = rows;
    } catch (err) {
        console.error('Error fetching data:', err);
    }

    // ส่ง session.user ไปยังไฟล์ EJS
    res.render('reports', { 
        category, 
        subcategory, 
        reports,
        user: req.session.user // เพิ่มบรรทัดนี้
    });
});

// ดึงหมวดหมู่ย่อยตามหมวดหมู่หลัก
app.get('/get-subcategories', async (req, res) => {
    const category = req.query.category;

    try {
        const connectionPromise = connect.promise();
        const query = `
            SELECT subctgname FROM subcategory
            WHERE ctgid = (SELECT ctgid FROM category WHERE ctgname = ?)
        `;
        const [rows] = await connectionPromise.query(query, [category]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching subcategories:', err);
        res.status(500).send("ไม่สามารถดึงข้อมูลหมวดหมู่ย่อยได้");
    }
});

app.get('/download-pdf', async (req, res) => {
    const category = req.query.category || 'all';
    const subcategory = req.query.subcategory || 'all';
    const userid = req.query.userid || req.session.user?.userid;

    if (!userid) {
        return res.status(401).send("กรุณาเข้าสู่ระบบก่อนดาวน์โหลดรายงาน");
    }

    let reports = [];
    const report_name = `รายงานสมุนไพร - ${category}${subcategory !== 'all' ? ` - ${subcategory}` : ''}`;
    const report_date = new Date().toISOString();

    try {
        const connectionPromise = connect.promise();
        let query = `
            SELECT herbs.*, category.ctgname, subcategory.subctgname
            FROM herbs
            JOIN category ON herbs.ctgid = category.ctgid
            LEFT JOIN subcategory ON herbs.subctgid = subcategory.subctgid
        `;
        let params = [];

        if (category !== 'all' && subcategory !== 'all') {
            query += ` WHERE category.ctgname = ? AND subcategory.subctgname = ?`;
            params.push(category, subcategory);
        } else if (category !== 'all') {
            query += ` WHERE category.ctgname = ?`;
            params.push(category);
        } else if (subcategory !== 'all') {
            query += ` WHERE subcategory.subctgname = ?`;
            params.push(subcategory);
        }

        const [rows] = await connectionPromise.query(query, params);
        reports = rows;

        if (reports.length === 0) {
            return res.status(404).send("ไม่มีข้อมูลสมุนไพรในหมวดหมู่ที่เลือก");
        }

        const htmlContent = `
            <html>
                <head>
                    <title>รายงานสมุนไพร</title>
                    <style>
                        body { font-family: 'Sarabun', sans-serif; margin: 20px; line-height: 1.6; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
                        th { background-color: #f4f4f4; }
                    </style>
                </head>
                <body>
                    <h1>รายงานสมุนไพรไทยแยกตามหมวดหมู่: ${category}</h1>
                    <table>
                        <thead>
                            <tr>
                                <th>ชื่อสมุนไพร</th>
                                <th>หมวดหมู่ย่อย</th>
                                <th>ชื่อภาษาอังกฤษ</th>
                                <th>ชื่อวิทยาศาสตร์</th>
                                <th>วงค์ตระกูลพืช</th>
                                <th>สรรพคุณทางการแพทย์</th>
                                <th>ผลข้างเคียง</th>
                                <th>วิธีการใช้</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reports.map(herb => `   
                                <tr>
                                    <td>${herb.name_th}</td>
                                    <td>${herb.subctgname || '-'}</td>
                                    <td>${herb.name_en}</td>
                                    <td>${herb.scientific_name}</td>
                                    <td>${herb.family}</td>
                                    <td>${herb.benefits}</td>
                                    <td>${herb.side_effects}</td>
                                    <td>${herb.usage_method}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `;

        pdf.create(htmlContent, { format: 'A4' }).toBuffer(async (err, buffer) => {
            if (err) {
                console.error('Error generating PDF:', err);
                return res.status(500).send("ไม่สามารถสร้าง PDF ได้");
            }

            // บันทึกรายงานลงฐานข้อมูล
            try {
                await connectionPromise.query(`
                    INSERT INTO reports (report_name, report_date, userid) 
                    VALUES (?, ?, ?)
                `, [report_name, report_date, userid]);

                console.log("บันทึกรายงานลงฐานข้อมูลเรียบร้อยแล้ว");

                res.contentType("application/pdf");
                res.send(buffer);
            } catch (error) {
                console.error('Error inserting report data into database:', error);
                res.status(500).send("ไม่สามารถบันทึกข้อมูลรายงานลงในฐานข้อมูลได้");
            }
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send("ไม่สามารถสร้างรายงาน PDF ได้");
    }
});


//----รายงานข้อมูลผู้ใช้----
app.get('/admin/userReports', async (req, res) => {
    const roleFilter = req.query.role || 'all';
    let users = [];

    try {
        const connectionPromise = connect.promise();

        const [rows] = await connectionPromise.query(`SELECT * FROM users`);
        users = rows;

        if (roleFilter !== 'all') {
            users = users.filter(user => user.role === roleFilter);
        }

    } catch (err) {
        console.error('Error fetching user data:', err);
        users = [];
    }

    res.render('admin/userReports', { users, roleFilter });
});


app.get('/download-pdff', async (req, res) => {
    const roleFilter = req.query.role || 'all';
    const userid = req.query.userid || req.session.user?.userid;
    if (!userid) {
        return res.status(401).send("กรุณาเข้าสู่ระบบก่อนดาวน์โหลดรายงาน");
    }

    let users = [];
    const reportName = `รายงานข้อมูลผู้ใช้ - ${roleFilter}`;
    const reportDate = new Date().toISOString();

    try {
        const connectionPromise = connect.promise();

        if (roleFilter === 'all') {
            const [rows] = await connectionPromise.query('SELECT * FROM users');
            users = rows;
        } else {
            const [rows] = await connectionPromise.query('SELECT * FROM users WHERE role = ?', [roleFilter]);
            users = rows;
        }

        if (users.length === 0) {
            return res.status(404).send("ไม่มีข้อมูลผู้ใช้ในบทบาทที่เลือก");
        }

        // สร้าง HTML สำหรับ PDF
        const htmlContent = `
            <html>
                <head>
                    <title>รายงานข้อมูลผู้ใช้</title>
                    <style>
                        body { font-family: 'Sarabun', sans-serif; margin: 20px; line-height: 1.6; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
                        th { background-color: #f4f4f4; }
                    </style>
                </head>
                <body>
                    <h1>รายงานข้อมูลผู้ใช้ตามบทบาท: ${roleFilter}</h1>
                    <table>
                        <thead>
                            <tr>
                                <th>ชื่อ</th>
                                <th>นามสกุล</th>
                                <th>อีเมล์</th>
                                <th>เบอร์โทรศัพท์</th>
                                <th>จังหวัด</th>
                                <th>อำเภอ</th>
                                <th>ตำบล</th>
                                <th>รหัสไปรษณีย์</th>
                                <th>บทบาท</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>${user.fname}</td>
                                    <td>${user.lname}</td>
                                    <td>${user.email}</td>
                                    <td>${user.phone}</td>
                                    <td>${user.province}</td>
                                    <td>${user.amphure}</td>
                                    <td>${user.sub_dis}</td>
                                    <td>${user.zip_code}</td>
                                    <td>${user.role}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `;

        pdf.create(htmlContent, { format: 'A4' }).toBuffer(async (err, buffer) => {
            if (err) return res.status(500).send("ไม่สามารถสร้าง PDF ได้");

            try {
                // บันทึกรายงานลงในตาราง reports พร้อม userid
                await connectionPromise.query(`
                    INSERT INTO reports (report_name, report_date, userid) 
                    VALUES (?, ?, ?)
                `, [reportName, reportDate, userid]);

                console.log("บันทึกรายงานลงฐานข้อมูลเรียบร้อยแล้ว");

                res.contentType("application/pdf");
                res.send(buffer);
            } catch (error) {
                console.error('Error inserting report data into database:', error);
                res.status(500).send("ไม่สามารถบันทึกข้อมูลรายงานลงในฐานข้อมูลได้");
            }
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send("ไม่สามารถสร้างรายงาน PDF ได้");
    }
});



//----เส้นทาง logout หน้าบ้าน----
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/home'); 
    });
});



//----เส้นทาง logout หลังบ้าน----
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error logging out:', err);
            return res.redirect('/adminHd');
        }
        res.redirect('/login');
    });
});


app.listen(4600, () => {
    console.log('Server started at http://localhost:4600');
});
