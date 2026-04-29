/**
 * Quick CLI to create a new client config from the template.
 * Usage: node scripts/seed-client.js <clientId> "<Business Name>" "<Agent Name>"
 */
const fs = require('fs');
const path = require('path');

const [,, clientId, businessName, agentName] = process.argv;

if (!clientId || !businessName || !agentName) {
  console.error('Usage: node scripts/seed-client.js <clientId> "<Business Name>" "<Agent Name>"');
  process.exit(1);
}

const template = {
  clientId,
  businessName,
  agentName,
  industry: "your industry here",
  timezone: "America/New_York",
  tone: "You are warm, professional, and concise.",
  businessHours: {
    "Monday":    "9:00 AM – 5:00 PM",
    "Tuesday":   "9:00 AM – 5:00 PM",
    "Wednesday": "9:00 AM – 5:00 PM",
    "Thursday":  "9:00 AM – 5:00 PM",
    "Friday":    "9:00 AM – 5:00 PM",
    "Saturday":  "Closed",
    "Sunday":    "Closed"
  },
  services: ["Edit this list with your services"],
  faqs: [
    { question: "What are your hours?", answer: "We are open Monday through Friday, 9 AM to 5 PM." }
  ],
  appointmentInstructions: "Collect the caller's name, phone number, preferred date and time, and reason for visit.",
  escalationNumber: "555-000-0000",
  closingStatement: `Thank you for calling ${businessName}. Have a great day!`,
  customInstructions: "",
  _meta: {
    stripeCustomerId: "",
    planStatus: "active",
    vapiPhoneNumberId: "",
    usageCapUSD: 20
  }
};

const outPath = path.join(__dirname, '../src/config/clients', `${clientId}.json`);

if (fs.existsSync(outPath)) {
  console.error(`Config already exists: ${outPath}`);
  process.exit(1);
}

fs.writeFileSync(outPath, JSON.stringify(template, null, 2));
console.log(`Created: ${outPath}`);
console.log('Edit the file to fill in services, FAQs, and business details.');
