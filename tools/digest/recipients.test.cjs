const {test} = require('node:test');
const assert = require('node:assert/strict');
const {address, recipients} = require('./recipients.cjs');
const event = (from, status, createdAt, extra=[]) => ({from,labels:['received',status,...extra],createdAt});

test('pending requests, sent confirmations and untrusted mail never become recipients', () => {
  assert.deepEqual(recipients({messages:[
    event('reader@example.test','rd-request','2026-10-14T12:00:00Z'),
    {from:'sender@example.test',labels:['sent','rd-active'],createdAt:'2026-10-14T12:00:00Z'},
    event('spam@example.test','rd-active','2026-10-14T12:00:00Z',['unauthenticated'])
  ]}), []);
});
test('latest unsubscribe wins even when messages are out of order and Date is forged', () => {
  assert.deepEqual(recipients({owner:'owner@example.test',messages:[
    event('owner@example.test','rd-unsubscribed','2026-10-14T15:00:00Z'),
    {...event('Owner <OWNER@example.test>','rd-active','2026-10-14T12:00:00Z'),timestamp:'2099-01-01T00:00:00Z'}
  ]}), []);
});
test('a later confirmed resubscription restores delivery and duplicate records do not duplicate mail', () => {
  assert.deepEqual(recipients({messages:[
    event('reader@example.test','rd-unsubscribed','2026-10-14T12:00:00Z'),
    event('Reader <reader@example.test>','rd-active','2026-10-14T15:00:00Z'),
    event('READER@example.test','rd-active','2026-10-14T15:00:00Z')
  ]}), ['reader@example.test']);
});
test('ambiguous or injected sender headers fail closed', () => {
  for (const value of ['a@example.test, b@example.test','a@example.test\r\nBcc: b@example.test','A <a@example.test> <b@example.test>']) assert.throws(() => address(value));
  assert.throws(() => recipients({messages:[event('a@example.test','rd-active','bad')]}));
});
