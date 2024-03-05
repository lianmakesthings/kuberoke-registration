function handler(event) {
  var authHeaders = event.request.headers.authorization;

  // The Base64-encoded Auth string that should be present.
  // base64([username]:[password])


  // TODO change this (example below is kuberoke:fun4days)

  var expected = "ABC123456DEF"; //"Basic a3ViZXJva2U6ZnVuNGRheXM="

  if (authHeaders && authHeaders.value === expected) {
    return event.request;
  }

  var response = {
    statusCode: 401,
    statusDescription: "Unauthorized",
    headers: {
      "www-authenticate": {
        value: 'Basic realm="Enter credentials for this site"',
      },
    },
  };

  return response;
}
