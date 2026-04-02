using System;
using System.Runtime.CompilerServices;

namespace UnityEngine
{
	internal sealed class DebugLogHandler : ILogHandler
	{
		[MethodImpl(MethodImplOptions.InternalCall)]
		[ThreadAndSerializationSafe]
		[WrapperlessIcall]
		internal static extern void Internal_Log(LogType level, string msg, [Writable] Object obj);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		[ThreadAndSerializationSafe]
		internal static extern void Internal_LogException(Exception exception, [Writable] Object obj);

		public void LogFormat(LogType logType, Object context, string format, params object[] args)
		{
			Internal_Log(logType, string.Format(format, args), context);
		}

		public void LogException(Exception exception, Object context)
		{
			Internal_LogException(exception, context);
		}
	}
}
