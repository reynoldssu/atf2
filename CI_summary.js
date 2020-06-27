const axios = require('axios');
const debug = require('debug')('slash-command-template:ticket');
const qs = require('querystring');

/*
 *  Send ticket creation confirmation via
 *  chat.postMessage to the user who created it
 */
const sendConfirmation = (submission) => {
  axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
    token: process.env.SLACK_ACCESS_TOKEN,
    channel: 'ioc-atf',
    as_user: true,
    text: ' ',
    attachments: JSON.stringify([
      {
        title: ` `,
        // Get this from the 3rd party helpdesk system
        title_link: 'http://example.com',
        text: ' ',
        fields: [
          {
            title: ':tada: Here is your After-the-Fact Summary Data!',
          },   
          {
            value:submission.atf_ci.atf_ci.selected_option.value,
          },     
          {
            value:submission.atf_start.atf_start.value,
          },
          {
            value:submission.atf_finish.atf_finish.value,
          }, 
          {
            value:submission.atf_issue.atf_issue.value,
          }, 
          {
            value:submission.atf_impact.atf_impact.value,
          },           
          {
            value:submission.atf_cause.atf_cause.value,
          }, 
          {
            value:submission.atf_fix.atf_fix.value,
          }, 
          {
            value:submission.atf_rca.atf_rca.value,
          }, 
            
            
            
 //           value: "After-the-Fact: From " + submission.start + " until " + submission.fixed + " PT, " + submission.issue + ". " + submission.causec + " " + submission.cause + ". " + submission.resolutionc + " " + submission.fix + ". A formal RCA will be performed by " + submission.rca + ".",
          
          
        ],
      },
    ]),
  })).then((result) => {
    debug('sendConfirmation: %o', result.data);
  }).catch((err) => {
    debug('sendConfirmation error: %o', err);
    console.error(err);
  });
};


module.exports = { sendConfirmation };













// Non-relevant below 

//Create helpdesk ticket. Call users.find to get the user's email address
// from their user ID
//const create = (userId, submission) => {
// const ticket = {};

// const fetchUserEmail = new Promise((resolve, reject) => {
//   users.find(userId).then((result) => {
 //     debug(`Find user: ${userId}`);
 //    resolve(result.data.user && result.data.user.profile ? result.data.user.profile.email : 'susan@susankreynolds.com');//TODO: Update this conditional
//   }).catch((err) => { reject(err); });
// });

//  fetchUserEmail.then((result) => {
 //  ticket.userId = userId;
 //   ticket.userEmail = result;
//    ticket.title = submission.title;
//    ticket.start = submission.start;
//    ticket.fixed= submission.fixed;
 //   ticket.issue= submission.issue;   
    
//    sendConfirmation(ticket);

//    return ticket;
//  }).catch((err) => { console.error(err); });
//};

//module.exports = { create, sendConfirmation };