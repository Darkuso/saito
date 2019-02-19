var saito = require('../saito');

/**
 * Constructor
 *
 * DNS module allows applications to translate between human-
 * readable addresses and publickeys. This is such a core part
 * of the Saito applications that it is managed by this stand-
 * alone class.
 *
 * Servers interested in running DNS servers can run them as 
 * registry modules, configured for the domain they wish to
 * support.
 **/
function DNS(app) {

  if (!(this instanceof DNS)) {
    return new DNS(app);
  }

  this.app     = app || {};

  this.dns               = {};
  this.dns.domains       = [];

  return this;

}
module.exports = DNS;



/**
 * we figure out which DNS servers we are supposed to be using and 
 * connect to them if we are not already connected to then, remembering
 * to specify that we will not send blocks, transactions or golden
 * tickets to DNS servers.
**/
DNS.prototype.initialize = function initialize() {

  //
  // identify dns servers
  //
  if (this.app.options.dns != null) {
    for (let i = 0; i < this.app.options.dns.length; i++) {
      this.dns.domains[i] = this.app.options.dns[i];
    }
  }

  //
  // connect to dns servers as peers
  //
  for (let i = 0; i < this.dns.domains.length; i++) {
    let { host, port, protocol } = this.dns.domains[i];
    this.app.logger.logInfo(`DNS attempting to connect to the following peer: ${protocol}://${host}:${port}`);
    this.app.network.addPeer(JSON.stringify(this.dns.domains[i]), 0, 0, 0);
  }

}


/**
 * fetchIndentifier associated with public key
 *
 * @params {string} publickey
 * @params {callback}
 *
**/
DNS.prototype.fetchIdentifier = function fetchIdentifier(publickey, mycallback) {

  for (let s = 0; s < this.dns.domains.length; s++) {
    for (let t = 0; t < this.app.network.peers.length; t++) {
      if (this.dns.domains[s].publickey == this.app.network.peers[t].peer.publickey) {

        // find out initial state of peer and blockchain
        var userMessage = {};
            userMessage.request         = "dns";
            userMessage.data            = {};
            userMessage.data.request    = "dns";
            userMessage.data.publickey  = publickey;

        // fetch publickey of peer
        this.app.network.peers[t].sendRequestWithCallback(userMessage.request, userMessage.data, mycallback);
        return;

      }
    }
  }

  mycallback('{ err: "no DNS servers found" }');
  return;

}


/**
 * fetch publickey associated with identifier
 *
 * @params {string} identifier
 * @params {callback}
 *
**/
DNS.prototype.fetchPublicKey = function fetchPublicKey(id, mycallback) {

  let domain = "";
  let domain_server_exists = 0;
  let alternate_server_exists = 0;

  if (id.indexOf("@") > 0) { domain = id.substring(id.indexOf("@")+1); }

  if (this.dns.domains.length == 0) {
    let tmpr = {}; tmpr.err = "no dns servers";
    mycallback(JSON.stringify(tmpr));
    return;
  }

  for (var s = 0; s < this.dns.domains.length; s++) {
    if (this.dns.domains[s].domain == domain) { 
      alternate_server_exists = 1;
      for (var t = 0; t < this.app.network.peers.length; t++) {
	if (this.dns.domains[s].publickey == this.app.network.peers[t].peer.publickey && this.app.network.peers[t].peer.publickey != "") {

	  domain_server_exists = 1;

          // find out initial state of peer and blockchain
          var userMessage = {};
              userMessage.request         = "dns";
              userMessage.data            = {};
              userMessage.data.request    = "dns";
              userMessage.data.identifier = id;

	  // fetch publickey of peer
          this.app.network.peers[t].sendRequestWithCallback(userMessage.request, userMessage.data, mycallback);
          return;
        }
      }
    }
  }

  var tmpr = {};
  if (domain_server_exists == 0) {
    if (alternate_server_exists == 1) {
      tmpr.err = "dns server publickey changed";
      mycallback(JSON.stringify(tmpr));
      return;
    } else {
      tmpr.err = "server not found";
      mycallback(JSON.stringify(tmpr));
      return;
    }
  }
  return;
}

/**
 * Returns the public key of the master DNS
 *
 * @return {string} publickey
 */

DNS.prototype.returnPublicKey = function returnPublicKey() {
  if (this.dns.length > 0) {
    if (this.dns[0].publickey != null) {
      return this.dns[0].publickey;
    }
  }

  return null;
}


/**
 * checks that a record is cryptographically valid
 *
 * @params {js obj} response from one of the fetch functions
 * @returns boolean
 *
**/
DNS.prototype.isRecordValid = function isRecordValid(answer) {

  var obj;

  try {
    obj = JSON.parse(answer);
  } catch (err) {
    return 0;
  }

  if (obj.err != "") { return 0; }

  let msgtoverify = obj.identifier + obj.publickey + obj.block_id + obj.block_hash;
  let registrysig = this.app.crypto.verifyMessage(msgtoverify, obj.signature, obj.signer);
  return registrysig;

}

DNS.prototype.isActive = function isActive() {

  for (let s = 0; s < this.dns.domains.length; s++) {
    for (let t = 0; t < this.app.network.peers.length; t++) {
      if (this.dns.domains[s].publickey == this.app.network.peers[t].peer.publickey) {
	return true;
      }
    }
  }

  return false;

}


