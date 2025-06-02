import { motion } from "framer-motion";
import { ExclamationTriangleIcon, ShieldExclamationIcon, WifiIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface ErrorPageProps {
  error: {
    code: string;
    description: string;
    validatedURL: string;
  };
  onRetry: () => void;
  onGoBack: () => void;
  canGoBack: boolean;
}

export function ErrorPage({ error, onRetry, onGoBack, canGoBack }: ErrorPageProps) {
  const getErrorInfo = (code: string) => {
    switch (code) {
      case "ERR_CERT_AUTHORITY_INVALID":
        return {
          icon: ShieldExclamationIcon,
          title: "Certificate Authority Invalid",
          description: "This site's security certificate is not trusted by your system.",
          suggestions: [
            "The website's security certificate has expired or is invalid",
            "Your system date and time might be incorrect",
            "You may be connected to an untrusted network",
            "This could be a man-in-the-middle attack",
          ],
          iconColor: "text-red-500",
          bgColor: "bg-red-50",
        };
      case "ERR_CERT_COMMON_NAME_INVALID":
        return {
          icon: ShieldExclamationIcon,
          title: "Certificate Name Mismatch",
          description: "This site's certificate doesn't match the website address.",
          suggestions: [
            "The certificate was issued for a different domain",
            "You may have typed the wrong URL",
            "The website may be configured incorrectly",
          ],
          iconColor: "text-red-500",
          bgColor: "bg-red-50",
        };
      case "ERR_CERT_DATE_INVALID":
        return {
          icon: ShieldExclamationIcon,
          title: "Certificate Date Invalid",
          description: "This site's security certificate has expired or is not yet valid.",
          suggestions: [
            "The website's certificate has expired",
            "Your system date and time might be incorrect",
            "The website needs to renew its certificate",
          ],
          iconColor: "text-red-500",
          bgColor: "bg-red-50",
        };
      case "ERR_INTERNET_DISCONNECTED":
      case "ERR_NETWORK_CHANGED":
        return {
          icon: WifiIcon,
          title: "No Internet Connection",
          description: "Unable to connect to the internet.",
          suggestions: [
            "Check your internet connection",
            "Try connecting to a different network",
            "Contact your network administrator",
          ],
          iconColor: "text-orange-500",
          bgColor: "bg-orange-50",
        };
      case "ERR_NAME_NOT_RESOLVED":
        return {
          icon: ExclamationTriangleIcon,
          title: "Website Not Found",
          description: "The website address couldn't be found.",
          suggestions: [
            "Check that you typed the URL correctly",
            "The website might be temporarily down",
            "Try searching for the website instead",
          ],
          iconColor: "text-yellow-500",
          bgColor: "bg-yellow-50",
        };
      case "ERR_CONNECTION_REFUSED":
        return {
          icon: ExclamationTriangleIcon,
          title: "Connection Refused",
          description: "The website refused to connect.",
          suggestions: [
            "The website might be down for maintenance",
            "Your firewall or antivirus might be blocking the connection",
            "Try again in a few minutes",
          ],
          iconColor: "text-red-500",
          bgColor: "bg-red-50",
        };
      case "ERR_TIMED_OUT":
        return {
          icon: ExclamationTriangleIcon,
          title: "Connection Timed Out",
          description: "The website took too long to respond.",
          suggestions: [
            "The website might be experiencing high traffic",
            "Your internet connection might be slow",
            "Try refreshing the page",
          ],
          iconColor: "text-orange-500",
          bgColor: "bg-orange-50",
        };
      default:
        return {
          icon: ExclamationTriangleIcon,
          title: "Unable to Load Page",
          description: error.description || "An unknown error occurred while loading this page.",
          suggestions: ["Try refreshing the page", "Check your internet connection", "Try again later"],
          iconColor: "text-gray-500",
          bgColor: "bg-gray-50",
        };
    }
  };

  const errorInfo = getErrorInfo(error.code);
  const Icon = errorInfo.icon;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${errorInfo.bgColor} mb-6`}
        >
          <Icon className={`w-10 h-10 ${errorInfo.iconColor}`} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-2xl font-bold text-gray-900 mb-4"
        >
          {errorInfo.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-gray-600 mb-6 leading-relaxed"
        >
          {errorInfo.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-left bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6"
        >
          <h3 className="font-semibold text-gray-900 mb-3">Possible causes:</h3>
          <ul className="space-y-2">
            {errorInfo.suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="flex items-start space-x-2"
              >
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span className="text-gray-600 text-sm">{suggestion}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center space-y-3"
        >
          <div className="text-sm text-gray-500 mb-4">
            <span className="font-medium">URL:</span> {error.validatedURL}
          </div>
          <div className="text-sm text-gray-500 mb-6">
            <span className="font-medium">Error Code:</span> {error.code}
          </div>

          <div className="flex items-center justify-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRetry}
              className="flex items-center space-x-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-md hover:shadow-lg"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>Try Again</span>
            </motion.button>

            {canGoBack && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onGoBack}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Go Back
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
