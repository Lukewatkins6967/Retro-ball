using System;
using System.Runtime.CompilerServices;

namespace UnityEngine.Networking
{
	internal sealed class ConnectionConfigInternal : IDisposable
	{
		internal IntPtr m_Ptr;

		public extern int ChannelSize
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		private ConnectionConfigInternal()
		{
		}

		public ConnectionConfigInternal(ConnectionConfig config)
		{
			if (config == null)
			{
				throw new NullReferenceException("config is not defined");
			}
			InitWrapper();
			InitPacketSize(config.PacketSize);
			InitFragmentSize(config.FragmentSize);
			InitResendTimeout(config.ResendTimeout);
			InitDisconnectTimeout(config.DisconnectTimeout);
			InitConnectTimeout(config.ConnectTimeout);
			InitMinUpdateTimeout(config.MinUpdateTimeout);
			InitPingTimeout(config.PingTimeout);
			InitReducedPingTimeout(config.ReducedPingTimeout);
			InitAllCostTimeout(config.AllCostTimeout);
			InitNetworkDropThreshold(config.NetworkDropThreshold);
			InitOverflowDropThreshold(config.OverflowDropThreshold);
			InitMaxConnectionAttempt(config.MaxConnectionAttempt);
			InitAckDelay(config.AckDelay);
			InitMaxCombinedReliableMessageSize(config.MaxCombinedReliableMessageSize);
			InitMaxCombinedReliableMessageCount(config.MaxCombinedReliableMessageCount);
			InitMaxSentMessageQueueSize(config.MaxSentMessageQueueSize);
			InitIsAcksLong(config.IsAcksLong);
			InitUsePlatformSpecificProtocols(config.UsePlatformSpecificProtocols);
			InitWebSocketReceiveBufferMaxSize(config.WebSocketReceiveBufferMaxSize);
			for (byte b = 0; b < config.ChannelCount; b++)
			{
				AddChannel(config.GetChannel(b));
			}
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitWrapper();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern byte AddChannel(QosType value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern QosType GetChannel(int i);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitPacketSize(ushort value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitFragmentSize(ushort value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitResendTimeout(uint value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitDisconnectTimeout(uint value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitConnectTimeout(uint value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitMinUpdateTimeout(uint value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitPingTimeout(uint value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitReducedPingTimeout(uint value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitAllCostTimeout(uint value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitNetworkDropThreshold(byte value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitOverflowDropThreshold(byte value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitMaxConnectionAttempt(byte value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitAckDelay(uint value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitMaxCombinedReliableMessageSize(ushort value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitMaxCombinedReliableMessageCount(ushort value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitMaxSentMessageQueueSize(ushort value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitIsAcksLong(bool value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitUsePlatformSpecificProtocols(bool value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void InitWebSocketReceiveBufferMaxSize(ushort value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[ThreadAndSerializationSafe]
		[WrapperlessIcall]
		public extern void Dispose();

		~ConnectionConfigInternal()
		{
			Dispose();
		}
	}
}
