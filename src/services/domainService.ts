import axios from "axios";
import { promises as dnsPromises } from "dns";

export interface DNSRecord {
  type: string;
  value: string;
}

export interface GeolocationData {
  ip: string;
  lat: number;
  lon: number;
  city: string;
  country: string;
  isp: string;
  asn: string;
}

export interface PortData {
  port: number;
  service: string;
  banner?: string;
}

export interface DomainResult {
  target: string;
  whois?: any;
  dns: DNSRecord[];
  geolocation?: GeolocationData;
  ports?: PortData[];
}

async function getWhois(domain: string): Promise<any> {
  try {
    const response = await axios.get(`https://whoisjs.com/api/v1/${domain}`, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

async function getDNSRecords(target: string): Promise<DNSRecord[]> {
  const records: DNSRecord[] = [];

  try {
    const [aRecords, aaaaRecords, mxRecords, nsRecords, txtRecords, cnameRecords] =
      await Promise.all([
        dnsPromises.resolve(target, "A").catch(() => []),
        dnsPromises.resolve(target, "AAAA").catch(() => []),
        dnsPromises.resolve(target, "MX").catch(() => []),
        dnsPromises.resolve(target, "NS").catch(() => []),
        dnsPromises.resolve(target, "TXT").catch(() => []),
        dnsPromises.resolve(target, "CNAME").catch(() => []),
      ]);

    aRecords.forEach((ip) => records.push({ type: "A", value: ip }));
    aaaaRecords.forEach((ip) => records.push({ type: "AAAA", value: ip }));
    mxRecords.forEach((mx) => records.push({ type: "MX", value: mx.exchange }));
    nsRecords.forEach((ns) => records.push({ type: "NS", value: ns }));
    txtRecords.forEach((txt) => records.push({ type: "TXT", value: txt.join(" ") }));
    cnameRecords.forEach((cname) => records.push({ type: "CNAME", value: cname }));
  } catch (error) {
    console.error("DNS lookup error:", error);
  }

  return records;
}

async function getGeolocation(ip: string): Promise<GeolocationData | null> {
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`, {
      timeout: 10000,
    });

    if (response.data.status === "success") {
      return {
        ip: response.data.query,
        lat: response.data.lat,
        lon: response.data.lon,
        city: response.data.city,
        country: response.data.country,
        isp: response.data.isp,
        asn: response.data.as,
      };
    }
  } catch (error) {
    console.error("Geolocation error:", error);
  }

  return null;
}

async function getShodanData(ip: string): Promise<PortData[]> {
  try {
    const response = await axios.get(`https://internetdb.shodan.io/${ip}`, {
      timeout: 10000,
    });

    if (response.data.ports && response.data.tags) {
      return response.data.ports.map((port: number, index: number) => ({
        port,
        service: response.data.tags[index] || "unknown",
        banner: response.data.vulns?.join(", ") || undefined,
      }));
    }
  } catch (error) {
    console.error("Shodan error:", error);
  }

  return [];
}

async function resolveIP(target: string): Promise<string | null> {
  try {
    const addresses = await dnsPromises.resolve(target, "A");
    return addresses[0] || null;
  } catch (error) {
    return null;
  }
}

export async function analyzeDomain(target: string): Promise<DomainResult> {
  const result: DomainResult = { target, dns: [] };

  const whois = await getWhois(target);
  if (whois) {
    result.whois = whois;
  }

  const dnsRecords = await getDNSRecords(target);
  result.dns = dnsRecords;

  const ip = await resolveIP(target);
  if (ip) {
    const geolocation = await getGeolocation(ip);
    if (geolocation) {
      result.geolocation = geolocation;
    }

    const ports = await getShodanData(ip);
    if (ports.length > 0) {
      result.ports = ports;
    }
  }

  return result;
}
