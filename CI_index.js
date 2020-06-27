//NOTE: requires "rest_service" role or "admin" <------------


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

    //CREATE MODAL PAYLOAD, SLACK API TOKEN, AND TRIGGER ID
    const modal = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id: trigger_id,
      view: JSON.stringify({
        type: "modal",
        title: {
          type: "plain_text",
          text: "Report an After-the-Fact"
        },
        submit: {
          type: "plain_text",
          text: "Submit"
        },
        callback_id: "submit-ticket",
        blocks: [
          {
            type: "input",
            block_id: "atf_ci",
            element: {
              type: "external_select",
              action_id: "atf_ci",
              placeholder: {
                type: "plain_text",
                text: "Search for CI"
              },
              min_query_length: 1
            },
            label: {
              type: "plain_text",
              text: "Configuration Item"
            }
          },
          {
            type: "input",
            block_id: "atf_start",
            element: {
              "type": "plain_text_input",
              "action_id": "atf_start"
            },
            "label": {
            "type": "plain_text",
            "text": "When did it start? (Like 01/23/20 1:12 PM)"
            }
          },
          {
            type: "input",
            block_id: "atf_finish",
            element: {
              "type": "plain_text_input",
              "action_id": "atf_finish"
            },
            "label": {
            "type": "plain_text",
            "text": "When was it fixed? (Like 01/24/20 8:35 AM)"
            }
          },
          {
            type: "input",
            block_id: "atf_issue",
            element: {
              "type": "plain_text_input",
              "action_id": "atf_issue"
            },
            "label": {
            "type": "plain_text",
            "text": "What was the issue?"
            }
          },
          {
            type: "input",
            block_id: "atf_impact",
            element: {
              "type": "plain_text_input",
              "action_id": "atf_impact"
            },
            "label": {
            "type": "plain_text",
            "text": "What was the impact?"
            }
          },
          {
            type: "input",
            block_id: "atf_cause",
            element: {
              "type": "plain_text_input",
              "action_id": "atf_cause"
            },
            "label": {
            "type": "plain_text",
            "text": "What was the cause?"
            }
          },
          
          {
            type: "input",
            block_id: "atf_fix",
            element: {
              "type": "plain_text_input",
              "action_id": "atf_fix"
            },
            "label": {
            "type": "plain_text",
            "text": "What was the fix?"
            }
          },
          
          {
            type: "input",
            block_id: "atf_rca",
            element: {
              "type": "plain_text_input",
              "action_id": "atf_rca"
            },
            "label": {
            "type": "plain_text",
            "text": "Who will own the RCA?"
            }
          }
        ]
      }),
    };

    const dialog = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id,
      dialog: JSON.stringify({
        title: "Report an After-the-Fact",
        callback_id: "submit-ticket",
        submit_label: "Submit",
        elements: [

          {
            label: "Configuration Item?",
            name: "atf_ci",
            type: "select",
            data_source: "external",
            placeholder: "Please select the CI"
          },
          {
            label: "When did it start? (Like 01/23/20 1:12 PM)",
            type: "text",
            name: "atf_start",
            value: text,
            optional: false
          },
          {
            label: "When was it fixed? (Like 01/24/20 8:35 AM)",
            type: "text",
            name: "atf_finish",
            value: text,
            optional: false
          },
          {
            label: "What was the issue?",
            type: "text",
            name: "atf_issue",
            value: text,
            optional: false
          },
          {
            label: "What was the impact?",
            type: "text",
            name: "atf_impact",
            value: text,
            optional: false
          },
          {
            label: "What was the cause?",
            type: "text",
            name: "atf_cause",
            value: text,
            optional: false
          },
          {
            label: "What was the fix?",
            type: "text",
            name: "atf_fix",
            value: text,
            optional: false
          },
          {
            label: "Who will own the RCA?",
            type: "text",
            name: "atf_rca",
            value: text,
            optional: false
          }
        ]
      })
    };
     
    console.log(qs.stringify(modal));
    
    //OPENS DIALOG AND SENDS PAYLOAD 
    axios
      .post(`${apiUrl}/views.open`, qs.stringify(modal))
      //.post(`${apiUrl}/dialog.open`, qs.stringify(dialog))
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

  load_cmdb_ci_from_sn(body.value,function(payload) {
    var atf_ci_list= {
      options: []
    };
    if (payload) {
      payload = payload.result;
      for (let i = 0; i < payload.length; i++) {
        atf_ci_list.options.push({
          text: {
            type: "plain_text",
            text: payload[i].name
        },
          value: payload[i].name //payload[i].sys_id
        });
        //console.log(payload[i].name);
      }
    }
    res.send(atf_ci_list);
  });
});

//ENDPOINT THAT RECEIVES THE DIALOG, CHECKS VERIFICATION TOKEN, AND CREATES INCIDENT
app.post("/interactive", (req, res) => {
  const body = JSON.parse(req.body.payload);

  // check that the verification token matches expected value
  if (signature.isVerified(req)) {
    //debug(`Incident request received: ${body.submission.trigger_id}`);

    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    res.send("");

    console.log("BODY:");
    console.log(body);
    postAftertheFact(body.view.state.values, body.token, body.user.id); // Send to SN

    // create the response
    summary.sendConfirmation(body.view.state.values);
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
    .get(
      "https://slack.com/api/users.info",
      qs.stringify({
        token: process.env.SLACK_ACCESS_TOKEN,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      })
    )
    .then(response => {
      console.log("RESPONSE: ");
      console.log(response);
    });
}

//Configuration Item function UNDER CONSTRUCTION, ASK AAROHI//
function load_cmdb_ci_from_sn(keyword, callback) {
  const instanceURL = "https://intuitdev01.service-now.com";
  const tableName = "cmdb_ci";
  keyword = encodeURIComponent(keyword);
  const options = {
    url: `${instanceURL}/api/now/table/${tableName}?sysparm_query=nameLIKE${keyword}&sysparm_query=operational_status=1&sysparm_fields=name,sys_id&sysparm_limit=100`,
    method: "get",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    auth: {
      username: "AfterTheFact", //SERVICE ACCOUNT IN SERVICENOW
      // OLD password: "7+tL#SKK2QYHG*Bm" //SERVICE ACCOUNT IN SERVICENOW
      password: "7-muvWd*3C^XxgpF"
    }
  };

  axios(options)
    .then(value => {
      if (value.status == 200) {
        console.log(
          "The cmdb list successfully loaded from SN" + qs.stringify(value.data)
        );
        callback(value.data);
      } else {
        console.log("Response from SN: " + qs.stringify(value));
      }
    })
    .catch(err => {
      console.log("Error occurred while loading payload from SN: " + err);
    });
}

//FUNCTION THAT PROCESSES THE FORM INPUTS AND CREATES SHORT_DESCRIPTION & SUMMARY
function postAftertheFact(requestBody, token, id) {
  const instanceURL = "https://intuitdev01.service-now.com";
  const tableName = "incident";
  
  requestBody = {
    atf_ci: requestBody.atf_ci.atf_ci.selected_option.value,
    atf_start: requestBody.atf_start.atf_start.value,
    atf_finish: requestBody.atf_finish.atf_finish.value,
    atf_issue: requestBody.atf_issue.atf_issue.value,
    atf_impact: requestBody.atf_impact.atf_impact.value,
    atf_cause: requestBody.atf_cause.atf_cause.value,
    atf_fix: requestBody.atf_fix.atf_fix.value,
    atf_rca: requestBody.atf_rca.atf_rca.value,
  };

  //processedBody.SHORT_DESCRIPTION
  var processedBody = {};
  processedBody.short_description =
    "After-the-Fact: " +
    requestBody.atf_issue.charAt(0).toUpperCase() +
    requestBody.atf_issue.slice(1) +
    "."; //capitalizes the first letter after colon in Short Description
    processedBody.description =
    "After-the-Fact: From " +
    requestBody.atf_start.toUpperCase() + //Makes sure AM and PM are capitalized
    " until " +
    requestBody.atf_finish.toUpperCase() + //Makes sure AM and PM are capitalized
    " PT, " +
    requestBody.atf_issue +
    ".  As a result, " +
    requestBody.atf_impact.charAt(0).toLowerCase() +
    requestBody.atf_impact.slice(1) + //makes sure Impact comes in starting with lowercase
    ".  The issue was caused by " +
    requestBody.atf_cause.charAt(0).toLowerCase() +
    requestBody.atf_cause.slice(1) + //makes sure Cause comes in starting with lowercase
    ".  To resolve, " +
    requestBody.atf_fix.charAt(0).toLowerCase() +
    requestBody.atf_fix.slice(1) + //makes sure Fix comes in starting with lowercase
    ".  A formal RCA will be performed by " +
    requestBody.atf_rca +
    ".";

  processedBody.cmdb_ci = requestBody.atf_ci;
  processedBody.caller_id = "Susan Reynolds";
  processedBody.opened_by = "Susan Reynolds";
  processedBody.state = "Resolved";
  processedBody.close_code = "Closed/Resolved by Caller";
  processedBody.close_notes = "After-the-Fact closed automatically.";

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
