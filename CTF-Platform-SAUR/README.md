# JARVIS CTF Platform

A futuristic, Iron Man-inspired Capture The Flag (CTF) training platform with 10 challenges across 5 categories.

## 🚀 Quick Start

1. Open `index.html` in your web browser
2. Browse through the challenge categories
3. Click on any challenge to view details
3. Submit the flag format: `SAUR{flag_content}`
5. Earn points and track your progress

## 📋 Challenge Categories & Flags

### 1. 🌐 Web Exploitation (2 Flags - 300 Points)

#### Easy: SQL Injection 101 (100 pts)
**Flag:** `SAUR{sql_injection_bypassed}`
- **Challenge:** Find the SQL injection vulnerability in the login form
- **Hint:** Try entering `admin' OR '1'='1` in the username field

#### Hard: XSS & CSRF Exploitation (200 pts)
**Flag:** `SAUR{xss_csrf_master}`
- **Challenge:** Exploit both XSS and CSRF vulnerabilities
- **Hint:** Craft a malicious payload that steals session cookies

---

### 2. 🔐 Cryptography (2 Flags - 300 Points)

#### Easy: Caesar Cipher Decryption (100 pts)
**Flag:** `SAUR{the_quick_brown_fox}`
- **Challenge:** Decrypt "Wkh txlfn eurzq ira mxpsv ryhu wkh odcb grj"
- **Hint:** Use a shift of 3 (ROT3)

#### Hard: RSA Private Key Recovery (200 pts)
**Flag:** `SAUR{rsa_private_key_exposed}`
- **Challenge:** Given RSA public parameters, determine the private key
- **Parameters:** n=6537424611447, e=65537
- **Hint:** Factor the modulus to find p and q, then calculate d

---

### 3. ⚙️ Binary Exploitation (2 Flags - 300 Points)

#### Easy: Buffer Overflow Basics (100 pts)
**Flag:** `SAUR{buffer_overflow_success}`
- **Challenge:** Overflow a fixed-size buffer to jump to a hidden function
- **Hint:** Pattern: AAAA...AAAA + return address

#### Hard: ROP Chain Exploitation (200 pts)
**Flag:** `SAUR{rop_chain_master}`
- **Challenge:** Construct a ROP chain to bypass ASLR protections
- **Hint:** Find gadgets in libc: pop rdi; ret; syscall

---

### 4. 🔍 Forensics (2 Flags - 300 Points)

#### Easy: Metadata Extraction (100 pts)
**Flag:** `SAUR{metadata_revealed}`
- **Challenge:** Extract hidden metadata from an image
- **Tool:** exiftool
- **Hint:** Check GPS coordinates and timestamps

#### Hard: Disk Image Recovery (200 pts)
**Flag:** `SAUR{deleted_files_recovered}`
- **Challenge:** Recover deleted files from a disk image
- **Tools:** photorec, sleuthkit
- **Hint:** Search unallocated space for file fragments

---

### 5. 🕵️ OSINT (2 Flags - 300 Points)

#### Easy: WHOIS & DNS Reconnaissance (100 pts)
**Flag:** `SAUR{osint_domain_enum}`
- **Challenge:** Perform WHOIS and DNS lookups on a domain
- **Commands:**
  ```bash
  whois domain.com
  nslookup -type=MX domain.com
  dig domain.com ANY
  ```
- **Hint:** Check registrant contact details

#### Hard: Social Engineering & OSINT (200 pts)
**Flag:** `SAUR{osint_social_engineer}`
- **Challenge:** Gather intelligence from public sources
- **Sources:** GitHub, LinkedIn, social media, company websites
- **Hint:** Piece together information from multiple sources

---

## 🎮 Features

- **Dynamic Challenge System:** 5 categories with 2 challenges each
- **Real-time Progress Tracking:** Visual progress bars for each category
- **Score System:** Earn points for each flag (Easy: 100pts, Hard: 200pts)
- **Persistent Storage:** Your progress is saved in browser localStorage
- **Futuristic UI:** Iron Man-inspired design with neon colors
- **Responsive Design:** Works on desktop and mobile devices
- **Smooth Animations:** Engaging visual effects and transitions

## 🎨 Design Highlights

- **Color Scheme:** Neon cyan (#00d4ff), Orange (#ff6b00), Acid Green (#00ff41)
- **Dark Theme:** Professional dark background (#0a0e27)
- **Glass Morphism:** Frosted glass effects with backdrop blur
- **Grid Animation:** Moving background grid pattern
- **Holographic Text:** Gradient-animated titles
- **Scanner Effects:** Animated scanning lines

## 💾 Local Storage

Your progress is automatically saved in your browser's localStorage:
- Completed challenges
- Total score
- Category progress

To reset progress: Open browser console and run:
```javascript
localStorage.removeItem('ctfProgress');
```

## 📱 Browser Compatibility

- Chrome/Chromium (Latest)
- Firefox (Latest)
- Safari (Latest)
- Edge (Latest)

## 🔧 Customization

### Add New Challenges

Edit `script.js` and add to the `challenges` object:

```javascript
'Category Name': {
    icon: '🎯',
    color: '#color-code',
    challenges: [
        {
            id: 'unique_id',
            title: 'Challenge Title',
            difficulty: 'easy', // or 'hard'
            points: 100,
            description: 'Challenge description',
            flag: 'CTF{flag_content}',
            category: 'Category Name'
        }
    ]
}
```

### Modify Colors

Update CSS variables in `styles.css`:

```css
:root {
    --primary-color: #00d4ff;
    --secondary-color: #ff6b00;
    --accent-color: #00ff41;
    /* ... more variables ... */
}
```

## 📊 Total Possible Points

| Category | Easy | Hard | Total |
|----------|------|------|-------|
| Web Exploitation | 100 | 200 | 300 |
| Cryptography | 100 | 200 | 300 |
| Binary Exploitation | 100 | 200 | 300 |
| Forensics | 100 | 200 | 300 |
| OSINT | 100 | 200 | 300 |
| **TOTAL** | **500** | **1000** | **1500** |

## 🎯 Difficulty Levels

- **Easy (100 pts):** Beginner-friendly challenges with clear hints
- **Hard (200 pts):** Advanced challenges requiring deeper knowledge and skills

## 📝 Tips for Solving Challenges

1. **Read carefully:** Each challenge description contains important clues
2. **Use online tools:** Many challenges require web-based or command-line tools
3. **Research:** Google specific techniques for each category
4. **Think outside the box:** Some solutions may be unconventional
5. **Document your process:** Keep notes on how you solved each challenge

## 🏆 Achievement System

Track your progress:
- 0-3 flags: Beginner
- 4-7 flags: Intermediate
- 8-10 flags: Master Hacker

## ❓ Troubleshooting

### Flags not submitting?
- Ensure you're using the correct format: `CTF{content}`
- Check capitalization (submission is case-insensitive)
- Clear browser cache and reload

### Progress not saving?
- Check if localStorage is enabled
- Try clearing browser cache
- Open DevTools console to verify storage

## 📚 Learning Resources

### Web Exploitation
- OWASP Top 10
- PortSwigger Web Security Academy
- HackTheBox Web challenges

### Cryptography
- CryptoPals Challenges
- Brilliant.org Cryptography Course
- CyberDefenders

### Binary Exploitation
- LiveOverflow Binary Hacking
- PicoCTF Binary Exploitation
- Exploit.education

### Forensics
- Digital Forensics & Incident Response (DFIR)
- Forensic Focus
- CyberDefenders Forensics

### OSINT
- Bellingcat's Online Investigation Toolkit
- OSINT Framework
- Google Dorking guides

## 🔒 Security Note

This is a **training platform** for educational purposes. Do not use these techniques on systems you don't own or have permission to test.

## 📄 License

This CTF platform is provided as-is for educational purposes.

---

**Enjoy hacking! 🚀⚡**
