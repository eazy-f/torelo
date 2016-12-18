export function subdomains(baseDomain) {
    if (baseDomain == "") {
        return [];
    } else {
        if (baseDomain[baseDomain.length - 1] != ".") {
            baseDomain = baseDomain + ".";
        }
        var parts = baseDomain.split(".");
        var domains = [];
        for (var i = 0; i < parts.length; i++) {
            domains.push(parts.slice(i, parts.length - 1).join("."));
        }
        return domains;
    }
}
