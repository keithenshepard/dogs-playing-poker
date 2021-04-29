// Show an object on the screen.
function showObject(obj) {
  const pre = document.getElementById('response');
  const preParent = pre.parentElement;
  pre.innerText = JSON.stringify(obj, null, 4);
  preParent.classList.add('flashing');
  setTimeout(() => preParent.classList.remove('flashing'), 300);
}

// Axios responses have a lot of data. This shows only the most relevant data.
function showResponse(axiosResponse) {
  const fullResponse = axiosResponse.response === undefined
    ? axiosResponse
    : axiosResponse.response;
  const abridgedResponse = {
    data: fullResponse.data,
    status: fullResponse.status,
    statusText: fullResponse.statusText,
  };
  showObject(abridgedResponse);
}

// IT IS UNLIKELY THAT YOU WILL WANT TO EDIT THE CODE ABOVE

// EDIT THE CODE BELOW TO SEND REQUESTS TO YOUR API

/**
 * Fields is an object mapping the names of the form inputs to the values typed in
 * e.g. for createUser, fields has properites 'username' and 'password'
 */

/**
 * You can use axios to make API calls like this:
 * const body = { bar: 'baz' };
 * axios.post('/api/foo', body)
 *   .then(showResponse) // on success (Status Code 200)
 *   .catch(showResponse); // on failure (Other Status Code)
 * See https://github.com/axios/axios for more info
 */

// Hint: do not assume a 1:1 mapping between forms and routes


/*
 Need helper functions for GETs with params,
  since if they are empty they end up mapping to a
  different route and error checking is tough.
 */

function anyFieldIsEmpty(fields) {
  return Object.keys(fields).filter((x) => !fields[x]).length > 0;
}


// function sendEmpty(fields) {
//   let missingFields = Object.keys(fields).filter((x) => !fields[x]);
//   axios.post('/api/errors/empty', missingFields)
//       .then(showResponse)
//       .catch(showResponse);
// }

// ---------------> General Axios Call

const GET = 0;
const POST = 1;
const PATCH = 2;
const DELETE = 3;

/**
 * All requests are in a similar form with error
 *  checking first and then picks what verb to send
 * @param verb{Number} - HTTP verb to send, number encoding above
 * @param path{String} - the URL to the path of the request
 * @param fields{Object} - fields of the request
 */
function generalRequest(verb, path, fields) {
  if (anyFieldIsEmpty(fields)) {
    sendEmpty(fields);
  } else if (verb === GET) {
    axios.get(path, fields)
        .then(showResponse)
        .catch(showResponse)
  } else if (verb === POST) {
    axios.post(path, fields)
        .then(showResponse)
        .catch(showResponse)
  } else if (verb === PATCH) {
    axios.patch(path, fields)
        .then(showResponse)
        .catch(showResponse)
  } else if (verb === DELETE) {
    axios.delete(path, fields)
        .then(showResponse)
        .catch(showResponse)
  }
}
// ---------------> User Endpoints

function pokerTest(fields) {
  generalRequest(GET, "/api/poker/test", fields);
}

function startPoker(fields) {
  generalRequest(POST, "/api/poker/start", fields);
}

// function createUser(fields) {
//   generalRequest(POST, "/api/users", fields);
// }


// IT IS UNLIKELY THAT YOU WILL WANT TO EDIT THE CODE BELOW

// map form (by id) to the function that should be called on submit
const formsAndHandlers = {
  // "poker-test": pokerTest,
  // 'create-user': createUser,
};

// attach handlers to forms
function init() {
  Object.entries(formsAndHandlers).forEach(([formID, handler]) => {
    const form = document.getElementById(formID);
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {};
      (new FormData(form)).forEach((value, key) => {
        data[key] = value;
      });
      handler(data);
      return false; // don't reload page
    };
  });
}

window.onload = init; // attach handlers once DOM is ready
