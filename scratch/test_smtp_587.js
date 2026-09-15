import nodemailer from 'nodemailer';
import fs from 'fs';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : undefined;
};

const smtpEmail = getEnv('SMTP_EMAIL');
const smtpPassword = getEnv('SMTP_PASSWORD');

async function test() {
  console.log('Testing SMTP with port 587:', smtpEmail);
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: smtpEmail,
      pass: smtpPassword
    }
  });

  try {
    await transporter.verify();
    console.log('SMTP Config Verified Successfully on 587!');
  } catch (err) {
    console.error('SMTP Error on 587:', err);
  }
}
test();
