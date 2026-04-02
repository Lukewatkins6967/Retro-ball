using System.Runtime.CompilerServices;

namespace UnityEngine
{
	public sealed class Avatar : Object
	{
		public extern bool isValid
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern bool isHuman
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		private Avatar()
		{
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void SetMuscleMinMax(int muscleId, float min, float max);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void SetParameter(int parameterId, float value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern float GetAxisLength(int humanId);

		internal Quaternion GetPreRotation(int humanId)
		{
			Quaternion value;
			INTERNAL_CALL_GetPreRotation(this, humanId, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetPreRotation(Avatar self, int humanId, out Quaternion value);

		internal Quaternion GetPostRotation(int humanId)
		{
			Quaternion value;
			INTERNAL_CALL_GetPostRotation(this, humanId, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetPostRotation(Avatar self, int humanId, out Quaternion value);

		internal Quaternion GetZYPostQ(int humanId, Quaternion parentQ, Quaternion q)
		{
			Quaternion value;
			INTERNAL_CALL_GetZYPostQ(this, humanId, ref parentQ, ref q, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetZYPostQ(Avatar self, int humanId, ref Quaternion parentQ, ref Quaternion q, out Quaternion value);

		internal Quaternion GetZYRoll(int humanId, Vector3 uvw)
		{
			Quaternion value;
			INTERNAL_CALL_GetZYRoll(this, humanId, ref uvw, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetZYRoll(Avatar self, int humanId, ref Vector3 uvw, out Quaternion value);

		internal Vector3 GetLimitSign(int humanId)
		{
			Vector3 value;
			INTERNAL_CALL_GetLimitSign(this, humanId, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetLimitSign(Avatar self, int humanId, out Vector3 value);
	}
}
