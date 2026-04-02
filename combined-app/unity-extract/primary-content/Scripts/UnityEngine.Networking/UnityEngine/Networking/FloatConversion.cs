namespace UnityEngine.Networking
{
	internal class FloatConversion
	{
		public static float ToSingle(uint value)
		{
			UIntFloat uIntFloat = new UIntFloat
			{
				intValue = value
			};
			return uIntFloat.floatValue;
		}

		public static double ToDouble(ulong value)
		{
			UIntFloat uIntFloat = new UIntFloat
			{
				longValue = value
			};
			return uIntFloat.doubleValue;
		}

		public static decimal ToDecimal(ulong value1, ulong value2)
		{
			UIntDecimal uIntDecimal = new UIntDecimal
			{
				longValue1 = value1,
				longValue2 = value2
			};
			return uIntDecimal.decimalValue;
		}
	}
}
