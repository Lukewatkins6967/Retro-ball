using System;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

namespace UnityEngine.Analytics
{
	[StructLayout(LayoutKind.Sequential)]
	internal sealed class UnityAnalyticsHandler : IDisposable
	{
		[NonSerialized]
		internal IntPtr m_Ptr;

		public UnityAnalyticsHandler()
		{
			InternalCreate();
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void InternalCreate();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		[ThreadAndSerializationSafe]
		internal extern void InternalDestroy();

		~UnityAnalyticsHandler()
		{
			InternalDestroy();
		}

		public void Dispose()
		{
			InternalDestroy();
			GC.SuppressFinalize(this);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern AnalyticsResult SetUserId(string userId);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern AnalyticsResult SetUserGender(Gender gender);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern AnalyticsResult SetUserBirthYear(int birthYear);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern AnalyticsResult Transaction(string productId, double amount, string currency);

		public AnalyticsResult Transaction(string productId, double amount, string currency, string receiptPurchaseData, string signature)
		{
			if (receiptPurchaseData == null)
			{
				receiptPurchaseData = string.Empty;
			}
			if (signature == null)
			{
				signature = string.Empty;
			}
			return InternalTransaction(productId, amount, currency, receiptPurchaseData, signature);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern AnalyticsResult InternalTransaction(string productId, double amount, string currency, string receiptPurchaseData, string signature);

		public AnalyticsResult CustomEvent(string customEventName)
		{
			return SendCustomEventName(customEventName);
		}

		public AnalyticsResult CustomEvent(CustomEventData eventData)
		{
			return SendCustomEvent(eventData);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern AnalyticsResult SendCustomEventName(string customEventName);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern AnalyticsResult SendCustomEvent(CustomEventData eventData);
	}
}
