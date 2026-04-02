namespace UnityEngine.Networking
{
	public class LogFilter
	{
		public enum FilterLevel
		{
			Developer = 0,
			Debug = 1,
			Info = 2,
			Warn = 3,
			Error = 4,
			Fatal = 5
		}

		internal const int Developer = 0;

		public const int Debug = 1;

		public const int Info = 2;

		public const int Warn = 3;

		public const int Error = 4;

		public const int Fatal = 5;

		public static FilterLevel current = FilterLevel.Info;

		private static int s_CurrentLogLevel = 2;

		public static int currentLogLevel
		{
			get
			{
				return s_CurrentLogLevel;
			}
			set
			{
				s_CurrentLogLevel = value;
			}
		}

		internal static bool logDev
		{
			get
			{
				return s_CurrentLogLevel <= 0;
			}
		}

		public static bool logDebug
		{
			get
			{
				return s_CurrentLogLevel <= 1;
			}
		}

		public static bool logInfo
		{
			get
			{
				return s_CurrentLogLevel <= 2;
			}
		}

		public static bool logWarn
		{
			get
			{
				return s_CurrentLogLevel <= 3;
			}
		}

		public static bool logError
		{
			get
			{
				return s_CurrentLogLevel <= 4;
			}
		}

		public static bool logFatal
		{
			get
			{
				return s_CurrentLogLevel <= 5;
			}
		}
	}
}
