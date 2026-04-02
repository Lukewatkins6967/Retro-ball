using System;

namespace UnityEngine.Assertions
{
	internal class AssertionMessageUtil
	{
		private const string k_Expected = "Expected:";

		private const string k_AssertionFailed = "Assertion failed.";

		public static string GetMessage(string failureMessage)
		{
			return UnityString.Format("{0} {1}", "Assertion failed.", failureMessage);
		}

		public static string GetMessage(string failureMessage, string expected)
		{
			return GetMessage(UnityString.Format("{0}{1}{2} {3}", failureMessage, Environment.NewLine, "Expected:", expected));
		}

		public static string GetEqualityMessage(object actual, object expected, bool expectEqual)
		{
			return GetMessage(UnityString.Format("Values are {0}equal.", (!expectEqual) ? string.Empty : "not "), UnityString.Format("{0} {2} {1}", actual, expected, (!expectEqual) ? "!=" : "=="));
		}

		public static string NullFailureMessage(object value, bool expectNull)
		{
			return GetMessage(UnityString.Format("Value was {0}Null", (!expectNull) ? string.Empty : "not "), UnityString.Format("Value was {0}Null", (!expectNull) ? "not " : string.Empty));
		}

		public static string BooleanFailureMessage(bool expected)
		{
			return GetMessage("Value was " + !expected, expected.ToString());
		}
	}
}
