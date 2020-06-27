require("dotenv").config();

const axios = require("axios");
const express = require("express");
const bodyParser = require("body-parser");
const qs = require("querystring");
const signature = require("./verifySignature");
const summary = require("./summary");
const debug = require("debug")("slash-command-template:index");

const apiUrl = "https://slack.com/api";

const app = express();

/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
};

app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));

app.get("/", (req, res) => {
  res.send(
  );
});

//ENDPOINT TO RECEIVE /atf SHASH COMMAND FROM SLACK, CHECKS VERIFICATION TOKEN, OPENS A DIALOG
app.post("/command", (req, res) => {

  //EXTRACT THE SLASH COMMAND TEXT AND TRIGGER ID FROM PAYLOAD
  const { text, trigger_id } = req.body;

  // VERIFY SIGNING SECRET
  if (signature.isVerified(req)) {

    //CREATE DIALOG PAYLOAD, SLACK API TOKEN, AND TRIGGER ID
    const dialog = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id,
      dialog: JSON.stringify({
        title: "Report an After-the-Fact",
        callback_id: "submit-ticket",
        submit_label: "Submit",
        elements: [
          
//          {
//            label: "Configuration Item?",
//            type: "external_select",
//            datasource: "external",
//            name: "cmdb_ci",
//            optional: false
//          },	
          
          {
            label: "When did it start? (1:12 PM 1/20)",
            type: "text",
            name: "atf_start",
            value: text,
            optional: false
          },
          {
            label: "When was it fixed? (8:35 AM 1/21)",
            type: "text",
            name: "atf_finish",
            value: text,
            optional: false
          },
          {
            label: "Issue? (Mint was broken)",
            type: "text",
            name: "atf_issue",
            value: text,
            optional: false
          },
          {
            label: "What was the impact? (Service was inaccessible)",
            type: "text",
            name: "atf_impact",
            value: text,
            optional: false
          },          
          {
            label: "What was the cause? (A recent change)",
            type: "text",
            name: "atf_cause",
            value: text,
            optional: false
          },
          {
            label: "What was the fix? (The change was rolled back)",
            type: "text",
            name: "atf_fix",
            value: text,
            optional: false
          },
          {
            label: "Who will own the RCA? (Mint.com)",
            type: "text",
            name: "atf_rca",
            value: text,
            optional: false
          }
        ]
      })
    };
  
//OPENS DIALOG AND SENDS PAYLOAD    
    axios
      .post(`${apiUrl}/dialog.open`, qs.stringify(dialog))
      .then(result => {
        debug("dialog.open: %o", result.data);
        res.send(result);
      })
      .catch(err => {
        debug("dialog.open call failed: %o", err);
        res.sendStatus(500);
      });
  } else {
    debug("Verification token mismatch");
    res.sendStatus(404);
  }
});

//Configuration Item EndPoint UNDER CONSTRUCTION ASK AAROHI//
app.post("/external", (req, res) => {
  const body = JSON.parse(req.body.payload);
  var atf_ci_options = {
      "options": [
      {
        "text": {
          "type": "plain_text",
          "text": "Concentrix"
        },
        "value": "953d72776f133dc021570ee9ea3ee434"
      }]
  };
  
  console.log(body);
  res.send(atf_ci_options);
});

//ENDPOINT THAT RECEIVES THE DIALOG, CHECKS VERIFICATION TOKEN, AND CREATES INCIDENT
app.post("/interactive", (req, res) => {
  const body = JSON.parse(req.body.payload);

  // check that the verification token matches expected value
  if (signature.isVerified(req)) {
    debug(`Incident request received: ${body.submission.trigger_id}`);

    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    res.send("");

    console.log("BODY:");
    console.log(body);
    postAftertheFact(body.submission, body.token, body.user.id); // Send to SN

    // create the response
    summary.sendConfirmation(body.submission);
  } else {
    debug("Token mismatch");
    res.sendStatus(404);
  }
});

//COLLECT LOGGING
const server = app.listen(process.env.PORT || 5000, () => {
  console.log(
    "Express server listening on port %d in %s mode",
    server.address().port,
    app.settings.env
  );
});

//FUNCTION TO GET USER'S NAME FROM SLACK
function getName() {
  axios
    .get("https://slack.com/api/users.info", qs.stringify({
      token: process.env.SLACK_ACCESS_TOKEN,
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
      }
  }))
    .then(response => {
      console.log("RESPONSE: ");
      console.log(response);
    });
}

//Configuration Item function UNDER CONSTRUCTION, ASK AAROHI//
function load_cmdb_ci_from_sn (token) {
  
  const instanceURL = "https://intuitdev01.service-now.com";
  const tableName = "cmdb_ci";   
  const options = {
    
    url: `${instanceURL}/api/now/table/${tableName}?sysparm_input_display_value=true&sysparm_display_value=true`,
    method: "get",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    auth: {
      username: "AfterTheFact", //Admin User employed to update ServiceNow
      // OLD password: "7+tL#SKK2QYHG*Bm" //SERVICE ACCOUNT IN SERVICENOW
      password: "7-muvWd*3C^XxgpF"
    }
  };

    axios(options)
    .then(value => {
      if (value.status == 200) {
        console.log("The record successfully created in SN");
      } else {
        console.log("Response from SN: " + qs.stringify(value));
      }
    })
    .catch(err => {
      console.log(
        "Error occurred while loading payload from SN: " + qs.stringify(err)
      );
    });
  };

//FUNCTION THAT PROCESSES THE FORM INPUTS AND CREATES SHORT_DESCRIPTION & SUMMARY
function postAftertheFact(requestBody, token, id) {
  const instanceURL = "https://intuitdev01.service-now.com";
  const tableName = "incident";
  var processedBody = {};
  
//processedBody.SHORT_DESCRIPTION
  processedBody.short_description =
    "After-the-Fact: " + requestBody.atf_issue.charAt(0).toUpperCase() + requestBody.atf_issue.slice(1) + ".";  
  
//processedBody.SUMMARY
    processedBody.u_xmatters_summary =    
    "After-the-Fact: From " +
    requestBody.atf_start.toUpperCase() + 
    " until " +
    requestBody.atf_finish.toUpperCase() + 
    " PT, " +
    requestBody.atf_issue +
     ".  As a result, " +
    requestBody.atf_impact.charAt(0).toLowerCase() + requestBody.atf_impact.slice(1) + 
    ".  The issue was caused by " +
    requestBody.atf_cause.charAt(0).toLowerCase() + requestBody.atf_cause.slice(1) + 
    ".  To resolve, " +
    requestBody.atf_fix.charAt(0).toLowerCase() + requestBody.atf_fix.slice(1) + 
    ".  A formal RCA will be performed by " +
    requestBody.atf_rca +
    " engineers.";
  
  processedBody.cmdb_ci = "Concentrix";  //FOR TESTING
  processedBody.assignment_group = "Tech Infr - IOC";  //FOR TESTING
  processedBody.caller_id = "Susan Reynolds";  //FOR TESTING
  processedBody.opened_by = "Susan Reynolds";  //FOR TESTING
  processedBody.state = "Resolved";  //KEEP
  processedBody.close_code = 'Closed/Resolved by Caller';  //KEEP
  processedBody.close_notes = 'After-the-Fact closed automatically.'; //KEEP

  
  const options = {
    url: `${instanceURL}/api/now/table/${tableName}?sysparm_input_display_value=true&sysparm_display_value=true`,
    method: "post",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    data: processedBody,
    auth: {
      username: "AfterTheFact", //SERVICE ACCOUNT IN SERVICENOW
      // OLD password: "7+tL#SKK2QYHG*Bm" //SERVICE ACCOUNT IN SERVICENOW
      password: "7-muvWd*3C^XxgpF"
    }
  };

//Axios is a Javascript library used to make HTTP requests
  axios(options)
    .then(value => {
      if (value.status == 201) {
        console.log("The record successfully created in SN");
      } else {
        console.log("Response from SN: " + qs.stringify(value));
      }
    })
    .catch(err => {
      console.log(
        "Error occurred while submission to SN: " + qs.stringify(err)
      );
    });
}

