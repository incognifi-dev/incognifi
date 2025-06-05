/// <reference types="vite/client" />

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { FiCheck, FiGlobe, FiMapPin, FiShield } from "react-icons/fi";

// Since contextIsolation is false, we can access electron directly
const { ipcRenderer } = window.require("electron");

interface ServerListProps {
  onSelect: (server: any) => void;
}

// Import all flag images using Vite's glob import
const flagModules = import.meta.glob("../flags/*.png", { eager: true, as: "url" });

// Create a mapping of country codes to flag URLs
const flagMap: Record<string, string> = {};
Object.entries(flagModules).forEach(([path, url]) => {
  const filename = path.split("/").pop()?.replace(".png", "") || "";
  flagMap[filename.toUpperCase()] = url as string;
});

// Helper function to get flag image
const getFlagImage = (countryCode: string): string => {
  // Handle special cases
  if (countryCode === "RANDOM" || countryCode === "EU") {
    return "";
  }

  // Return the flag URL or empty string if not found
  return flagMap[countryCode.toUpperCase()] || "";
};

// Comprehensive country list with Oxylabs server endpoints
const COMMON_COUNTRIES = [
  { code: "RANDOM", name: "Random", endpoint: "pr.oxylabs.io", port: 7777 },
  { code: "US", name: "United States", endpoint: "us-pr.oxylabs.io", port: 10000 },
  { code: "CA", name: "Canada", endpoint: "ca-pr.oxylabs.io", port: 30000 },
  { code: "GB", name: "Great Britain", endpoint: "gb-pr.oxylabs.io", port: 20000 },
  { code: "DE", name: "Germany", endpoint: "de-pr.oxylabs.io", port: 30000 },
  { code: "FR", name: "France", endpoint: "fr-pr.oxylabs.io", port: 40000 },
  { code: "ES", name: "Spain", endpoint: "es-pr.oxylabs.io", port: 10000 },
  { code: "IT", name: "Italy", endpoint: "it-pr.oxylabs.io", port: 20000 },
  { code: "SE", name: "Sweden", endpoint: "se-pr.oxylabs.io", port: 30000 },
  { code: "GR", name: "Greece", endpoint: "gr-pr.oxylabs.io", port: 40000 },
  { code: "PT", name: "Portugal", endpoint: "pt-pr.oxylabs.io", port: 10000 },
  { code: "NL", name: "Netherlands", endpoint: "nl-pr.oxylabs.io", port: 20000 },
  { code: "BE", name: "Belgium", endpoint: "be-pr.oxylabs.io", port: 30000 },
  { code: "RU", name: "Russia", endpoint: "ru-pr.oxylabs.io", port: 40000 },
  { code: "UA", name: "Ukraine", endpoint: "ua-pr.oxylabs.io", port: 10000 },
  { code: "PL", name: "Poland", endpoint: "pl-pr.oxylabs.io", port: 20000 },
  { code: "IL", name: "Israel", endpoint: "il-pr.oxylabs.io", port: 20000 },
  { code: "TR", name: "Turkey", endpoint: "tr-pr.oxylabs.io", port: 30000 },
  { code: "AU", name: "Australia", endpoint: "au-pr.oxylabs.io", port: 40000 },
  { code: "MY", name: "Malaysia", endpoint: "my-pr.oxylabs.io", port: 10000 },
  { code: "TH", name: "Thailand", endpoint: "th-pr.oxylabs.io", port: 20000 },
  { code: "KR", name: "South Korea", endpoint: "kr-pr.oxylabs.io", port: 30000 },
  { code: "JP", name: "Japan", endpoint: "jp-pr.oxylabs.io", port: 40000 },
  { code: "PH", name: "Philippines", endpoint: "ph-pr.oxylabs.io", port: 10000 },
  { code: "SG", name: "Singapore", endpoint: "sg-pr.oxylabs.io", port: 20000 },
  { code: "CN", name: "China", endpoint: "cn-pr.oxylabs.io", port: 30000 },
  { code: "HK", name: "Hong Kong", endpoint: "hk-pr.oxylabs.io", port: 40000 },
  { code: "TW", name: "Taiwan", endpoint: "tw-pr.oxylabs.io", port: 10000 },
  { code: "IN", name: "India", endpoint: "in-pr.oxylabs.io", port: 20000 },
  { code: "PK", name: "Pakistan", endpoint: "pk-pr.oxylabs.io", port: 30000 },
  { code: "IR", name: "Iran", endpoint: "ir-pr.oxylabs.io", port: 40000 },
  { code: "ID", name: "Indonesia", endpoint: "id-pr.oxylabs.io", port: 10000 },
  { code: "AZ", name: "Azerbaijan", endpoint: "az-pr.oxylabs.io", port: 20000 },
  { code: "KZ", name: "Kazakhstan", endpoint: "kz-pr.oxylabs.io", port: 30000 },
  { code: "AE", name: "UAE", endpoint: "ae-pr.oxylabs.io", port: 40000 },
  { code: "MX", name: "Mexico", endpoint: "mx-pr.oxylabs.io", port: 10000 },
  { code: "BR", name: "Brazil", endpoint: "br-pr.oxylabs.io", port: 20000 },
  { code: "AR", name: "Argentina", endpoint: "ar-pr.oxylabs.io", port: 30000 },
  { code: "CL", name: "Chile", endpoint: "cl-pr.oxylabs.io", port: 40000 },
  { code: "PE", name: "Peru", endpoint: "pe-pr.oxylabs.io", port: 10000 },
  { code: "EC", name: "Ecuador", endpoint: "ec-pr.oxylabs.io", port: 20000 },
  { code: "CO", name: "Colombia", endpoint: "co-pr.oxylabs.io", port: 30000 },
  { code: "ZA", name: "South Africa", endpoint: "za-pr.oxylabs.io", port: 40000 },
  { code: "EG", name: "Egypt", endpoint: "eg-pr.oxylabs.io", port: 10000 },
  { code: "AO", name: "Angola", endpoint: "ao-pr.oxylabs.io", port: 40000 },
  { code: "CM", name: "Cameroon", endpoint: "cm-pr.oxylabs.io", port: 41000 },
  { code: "CF", name: "Central African Republic", endpoint: "cf-pr.oxylabs.io", port: 42000 },
  { code: "TD", name: "Chad", endpoint: "td-pr.oxylabs.io", port: 43000 },
  { code: "BJ", name: "Benin", endpoint: "bj-pr.oxylabs.io", port: 44000 },
  { code: "ET", name: "Ethiopia", endpoint: "et-pr.oxylabs.io", port: 45000 },
  { code: "DJ", name: "Djibouti", endpoint: "dj-pr.oxylabs.io", port: 46000 },
  { code: "GM", name: "Gambia", endpoint: "gm-pr.oxylabs.io", port: 47000 },
  { code: "GH", name: "Ghana", endpoint: "gh-pr.oxylabs.io", port: 48000 },
  { code: "CI", name: "Côte d'Ivoire", endpoint: "ci-pr.oxylabs.io", port: 49000 },
  { code: "KE", name: "Kenya", endpoint: "ke-pr.oxylabs.io", port: 10000 },
  { code: "LR", name: "Liberia", endpoint: "lr-pr.oxylabs.io", port: 11000 },
  { code: "MG", name: "Madagascar", endpoint: "mg-pr.oxylabs.io", port: 12000 },
  { code: "ML", name: "Mali", endpoint: "ml-pr.oxylabs.io", port: 13000 },
  { code: "MR", name: "Mauritania", endpoint: "mr-pr.oxylabs.io", port: 14000 },
  { code: "MU", name: "Mauritius", endpoint: "mu-pr.oxylabs.io", port: 15000 },
  { code: "MA", name: "Morocco", endpoint: "ma-pr.oxylabs.io", port: 16000 },
  { code: "MZ", name: "Mozambique", endpoint: "mz-pr.oxylabs.io", port: 17000 },
  { code: "NG", name: "Nigeria", endpoint: "ng-pr.oxylabs.io", port: 18000 },
  { code: "SN", name: "Senegal", endpoint: "sn-pr.oxylabs.io", port: 19000 },
  { code: "SC", name: "Seychelles", endpoint: "sc-pr.oxylabs.io", port: 20000 },
  { code: "ZW", name: "Zimbabwe", endpoint: "zw-pr.oxylabs.io", port: 21000 },
  { code: "SS", name: "South Sudan", endpoint: "ss-pr.oxylabs.io", port: 22000 },
  { code: "SD", name: "Sudan", endpoint: "sd-pr.oxylabs.io", port: 23000 },
  { code: "TG", name: "Togo", endpoint: "tg-pr.oxylabs.io", port: 24000 },
  { code: "TN", name: "Tunisia", endpoint: "tn-pr.oxylabs.io", port: 25000 },
  { code: "UG", name: "Uganda", endpoint: "ug-pr.oxylabs.io", port: 26000 },
  { code: "ZM", name: "Zambia", endpoint: "zm-pr.oxylabs.io", port: 27000 },
  { code: "AF", name: "Afghanistan", endpoint: "af-pr.oxylabs.io", port: 28000 },
  { code: "BH", name: "Bahrain", endpoint: "bh-pr.oxylabs.io", port: 29000 },
  { code: "BD", name: "Bangladesh", endpoint: "bd-pr.oxylabs.io", port: 30000 },
  { code: "AM", name: "Armenia", endpoint: "am-pr.oxylabs.io", port: 31000 },
  { code: "BT", name: "Bhutan", endpoint: "bt-pr.oxylabs.io", port: 32000 },
  { code: "MM", name: "Myanmar", endpoint: "mm-pr.oxylabs.io", port: 33000 },
  { code: "KH", name: "Cambodia", endpoint: "kh-pr.oxylabs.io", port: 34000 },
  { code: "GE", name: "Georgia", endpoint: "ge-pr.oxylabs.io", port: 36000 },
  { code: "IQ", name: "Iraq", endpoint: "iq-pr.oxylabs.io", port: 37000 },
  { code: "JO", name: "Jordan", endpoint: "jo-pr.oxylabs.io", port: 38000 },
  { code: "LB", name: "Lebanon", endpoint: "lb-pr.oxylabs.io", port: 39000 },
  { code: "MV", name: "Maldives", endpoint: "mv-pr.oxylabs.io", port: 40000 },
  { code: "MN", name: "Mongolia", endpoint: "mn-pr.oxylabs.io", port: 41000 },
  { code: "OM", name: "Oman", endpoint: "om-pr.oxylabs.io", port: 42000 },
  { code: "QA", name: "Qatar", endpoint: "qa-pr.oxylabs.io", port: 43000 },
  { code: "SA", name: "Saudi Arabia", endpoint: "sa-pr.oxylabs.io", port: 44000 },
  { code: "VN", name: "Vietnam", endpoint: "vn-pr.oxylabs.io", port: 45000 },
  { code: "TM", name: "Turkmenistan", endpoint: "tm-pr.oxylabs.io", port: 46000 },
  { code: "UZ", name: "Uzbekistan", endpoint: "uz-pr.oxylabs.io", port: 47000 },
  { code: "YE", name: "Yemen", endpoint: "ye-pr.oxylabs.io", port: 48000 },
  { code: "AL", name: "Albania", endpoint: "al-pr.oxylabs.io", port: 49000 },
  { code: "AD", name: "Andorra", endpoint: "ad-pr.oxylabs.io", port: 10000 },
  { code: "AT", name: "Austria", endpoint: "at-pr.oxylabs.io", port: 11000 },
  { code: "BA", name: "Bosnia and Herzegovina", endpoint: "ba-pr.oxylabs.io", port: 13000 },
  { code: "BG", name: "Bulgaria", endpoint: "bg-pr.oxylabs.io", port: 14000 },
  { code: "BY", name: "Belarus", endpoint: "by-pr.oxylabs.io", port: 15000 },
  { code: "HR", name: "Croatia", endpoint: "hr-pr.oxylabs.io", port: 16000 },
  { code: "CY", name: "Cyprus", endpoint: "cy-pr.oxylabs.io", port: 35000 },
  { code: "CZ", name: "Czech Republic", endpoint: "cz-pr.oxylabs.io", port: 18000 },
  { code: "DK", name: "Denmark", endpoint: "dk-pr.oxylabs.io", port: 19000 },
  { code: "EE", name: "Estonia", endpoint: "ee-pr.oxylabs.io", port: 20000 },
  { code: "FI", name: "Finland", endpoint: "fi-pr.oxylabs.io", port: 21000 },
  { code: "HU", name: "Hungary", endpoint: "hu-pr.oxylabs.io", port: 23000 },
  { code: "IS", name: "Iceland", endpoint: "is-pr.oxylabs.io", port: 24000 },
  { code: "IE", name: "Ireland", endpoint: "ie-pr.oxylabs.io", port: 25000 },
  { code: "LV", name: "Latvia", endpoint: "lv-pr.oxylabs.io", port: 26000 },
  { code: "LI", name: "Liechtenstein", endpoint: "li-pr.oxylabs.io", port: 27000 },
  { code: "LT", name: "Lithuania", endpoint: "lt-pr.oxylabs.io", port: 28000 },
  { code: "LU", name: "Luxembourg", endpoint: "lu-pr.oxylabs.io", port: 29000 },
  { code: "MT", name: "Malta", endpoint: "mt-pr.oxylabs.io", port: 30000 },
  { code: "MC", name: "Monaco", endpoint: "mc-pr.oxylabs.io", port: 31000 },
  { code: "MD", name: "Moldova", endpoint: "md-pr.oxylabs.io", port: 32000 },
  { code: "ME", name: "Montenegro", endpoint: "me-pr.oxylabs.io", port: 33000 },
  { code: "NO", name: "Norway", endpoint: "no-pr.oxylabs.io", port: 34000 },
  { code: "RO", name: "Romania", endpoint: "ro-pr.oxylabs.io", port: 35000 },
  { code: "RS", name: "Serbia", endpoint: "rs-pr.oxylabs.io", port: 36000 },
  { code: "SK", name: "Slovakia", endpoint: "sk-pr.oxylabs.io", port: 37000 },
  { code: "SI", name: "Slovenia", endpoint: "si-pr.oxylabs.io", port: 38000 },
  { code: "CH", name: "Switzerland", endpoint: "ch-pr.oxylabs.io", port: 39000 },
  { code: "MK", name: "Macedonia", endpoint: "mk-pr.oxylabs.io", port: 40000 },
  { code: "BS", name: "Bahamas", endpoint: "bs-pr.oxylabs.io", port: 41000 },
  { code: "BZ", name: "Belize", endpoint: "bz-pr.oxylabs.io", port: 42000 },
  { code: "VG", name: "British Virgin Islands", endpoint: "vg-pr.oxylabs.io", port: 43000 },
  { code: "CR", name: "Costa Rica", endpoint: "cr-pr.oxylabs.io", port: 44000 },
  { code: "CU", name: "Cuba", endpoint: "cu-pr.oxylabs.io", port: 45000 },
  { code: "DM", name: "Dominica", endpoint: "dm-pr.oxylabs.io", port: 46000 },
  { code: "HT", name: "Haiti", endpoint: "ht-pr.oxylabs.io", port: 47000 },
  { code: "HN", name: "Honduras", endpoint: "hn-pr.oxylabs.io", port: 48000 },
  { code: "JM", name: "Jamaica", endpoint: "jm-pr.oxylabs.io", port: 49000 },
  { code: "AW", name: "Aruba", endpoint: "aw-pr.oxylabs.io", port: 10000 },
  { code: "PA", name: "Panama", endpoint: "pa-pr.oxylabs.io", port: 11000 },
  { code: "PR", name: "Puerto Rico", endpoint: "pr-pr.oxylabs.io", port: 12000 },
  { code: "TT", name: "Trinidad and Tobago", endpoint: "tt-pr.oxylabs.io", port: 13000 },
  { code: "FJ", name: "Fiji", endpoint: "fj-pr.oxylabs.io", port: 14000 },
  { code: "NZ", name: "New Zealand", endpoint: "nz-pr.oxylabs.io", port: 15000 },
  { code: "BO", name: "Bolivia", endpoint: "bo-pr.oxylabs.io", port: 16000 },
  { code: "PY", name: "Paraguay", endpoint: "py-pr.oxylabs.io", port: 17000 },
  { code: "UY", name: "Uruguay", endpoint: "uy-pr.oxylabs.io", port: 18000 },
  { code: "VE", name: "Venezuela", endpoint: "ve-pr.oxylabs.io", port: 19000 },
  { code: "EU", name: "European Union", endpoint: "eu-pr.oxylabs.io", port: 10000 },
  { code: "DO", name: "Dominican Republic", endpoint: "do-pr.oxylabs.io", port: 21000 },
  { code: "LA", name: "Laos", endpoint: "la-pr.oxylabs.io", port: 22000 },
  { code: "TZ", name: "Tanzania", endpoint: "tz-pr.oxylabs.io", port: 23000 },
  { code: "LK", name: "Sri Lanka", endpoint: "lk-pr.oxylabs.io", port: 24000 },
  { code: "BN", name: "Brunei", endpoint: "bn-pr.oxylabs.io", port: 25000 },
  { code: "NP", name: "Nepal", endpoint: "np-pr.oxylabs.io", port: 26000 },
  { code: "KW", name: "Kuwait", endpoint: "kw-pr.oxylabs.io", port: 20000 },
  { code: "GT", name: "Guatemala", endpoint: "gt-pr.oxylabs.io", port: 27000 },
  { code: "DZ", name: "Algeria", endpoint: "dz-pr.oxylabs.io", port: 29000 },
  { code: "NA", name: "Namibia", endpoint: "na-pr.oxylabs.io", port: 28000 },
];

export function ServerList({ onSelect }: ServerListProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>("US");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quick server selection function
  const handleQuickServerSelect = async (countryCode: string) => {
    const country = COMMON_COUNTRIES.find((c) => c.code === countryCode);
    if (!country) return;

    setIsLoading(true);
    setMessage(null);

    try {
      // Create server object to pass to the main process
      const serverConfig = {
        endpoint: country.endpoint,
        port: country.port,
        countryCode: countryCode,
      };

      // Set the proxy server
      const result = await ipcRenderer.invoke("set-proxy-server", serverConfig);

      if (result.success) {
        setSelectedCountry(countryCode);
        setMessage({
          type: "success",
          text: `Successfully switched to ${country.name}`,
        });

        // Create server object for the parent component
        const server = {
          id: `oxylabs-residential-${countryCode}`,
          country: country.name,
          countryCode: countryCode,
          city: "Residential Pool",
          ip: country.endpoint,
          port: country.port,
          ping: null,
          isHealthy: true,
          lastChecked: Date.now(),
          type: "oxylabs-residential",
        };

        onSelect(server);
      } else {
        setMessage({ type: "error", text: result.message || "Failed to switch server" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to switch server" });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200"
        >
          <div className="flex items-center justify-center mb-2">
            <FiShield className="w-6 h-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-bold text-indigo-800">Residential Proxies</h2>
          </div>
          <p className="text-sm text-indigo-600">
            Premium residential proxy network with global coverage and high success rates
          </p>
        </motion.div>
      </div>

      {/* Quick Server Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
      >
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <FiGlobe className="w-5 h-5 mr-2" />
          Quick Country Selection
        </h3>
        <p className="text-sm text-gray-600 mb-4">Click on a country to quickly switch your proxy location:</p>

        <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
          {COMMON_COUNTRIES.map((country) => (
            <motion.button
              key={country.code}
              onClick={() => handleQuickServerSelect(country.code)}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center p-2 rounded-lg border transition-all ${
                selectedCountry === country.code
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="w-6 h-6 mr-2 flex items-center justify-center">
                {country.code === "RANDOM" ? (
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">🌍</span>
                  </div>
                ) : country.code === "EU" ? (
                  <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                    <span className="text-yellow-300 text-sm">⭐</span>
                  </div>
                ) : (
                  <img
                    src={getFlagImage(country.code)}
                    alt={country.name}
                    className="w-6 h-6"
                  />
                )}
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{country.name}</div>
                <div className="text-xs text-gray-500">{country.code}</div>
              </div>
              {selectedCountry === country.code && <FiCheck className="w-4 h-4 text-indigo-600 ml-1" />}
            </motion.button>
          ))}
        </div>

        {/* Message Display */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mt-4 p-3 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              <div className="flex items-center">
                {message.type === "success" ? (
                  <FiCheck className="w-4 h-4 mr-2" />
                ) : (
                  <FiShield className="w-4 h-4 mr-2" />
                )}
                {message.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Information Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
      >
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <FiMapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800 mb-1">Residential Proxy Network</h4>
              <p className="text-xs text-blue-700 leading-relaxed">
                Access to millions of real residential IPs from actual devices worldwide. High success rates and minimal
                blocking.
              </p>
            </div>
          </div>

          <div className="border-t border-blue-200 pt-3">
            <div className="flex items-start space-x-3">
              <FiShield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-1">How It Works</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Your traffic will be routed through country-specific residential proxy endpoints with optimized
                  performance for each selected region.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
