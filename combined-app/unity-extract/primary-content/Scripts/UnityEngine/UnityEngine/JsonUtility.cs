using System;
using System.Runtime.CompilerServices;

namespace UnityEngine
{
	public static class JsonUtility
	{
		public static string ToJson(object obj)
		{
			return ToJson(obj, false);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[ThreadAndSerializationSafe]
		[WrapperlessIcall]
		public static extern string ToJson(object obj, bool prettyPrint);

		public static T FromJson<T>(string json)
		{
			return (T)FromJson(json, typeof(T));
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[ThreadAndSerializationSafe]
		[WrapperlessIcall]
		public static extern object FromJson(string json, Type type);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		[ThreadAndSerializationSafe]
		public static extern void FromJsonOverwrite(string json, object objectToOverwrite);
	}
}
