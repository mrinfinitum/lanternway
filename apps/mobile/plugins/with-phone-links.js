// Lets the app ask whether the phone can text or call (Linking.canOpenURL for sms: and tel:),
// for "Ask for a refill". Android 11+ only answers for intents listed under <queries>.
// (iOS lists the schemes in app.json: ios.infoPlist.LSApplicationQueriesSchemes.)
const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withPhoneLinks(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const wanted = ["sms", "smsto", "tel"];
    manifest.queries ??= [];
    const existing = new Set(
      manifest.queries.flatMap((q) => (q.intent ?? []).flatMap((i) => (i.data ?? []).map((d) => d.$?.["android:scheme"]))),
    );
    const intents = wanted
      .filter((scheme) => !existing.has(scheme))
      .map((scheme) => ({
        action: [{ $: { "android:name": scheme === "tel" ? "android.intent.action.DIAL" : "android.intent.action.SENDTO" } }],
        data: [{ $: { "android:scheme": scheme } }],
      }));
    if (intents.length) manifest.queries.push({ intent: intents });
    return cfg;
  });
};
