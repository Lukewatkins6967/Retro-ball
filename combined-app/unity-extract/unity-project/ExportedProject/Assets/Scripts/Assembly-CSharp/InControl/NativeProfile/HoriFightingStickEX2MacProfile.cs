namespace InControl.NativeProfile
{
	public class HoriFightingStickEX2MacProfile : Xbox360DriverMacProfile
	{
		public HoriFightingStickEX2MacProfile()
		{
			base.Name = "Hori Fighting Stick EX2";
			base.Meta = "Hori Fighting Stick EX2 on Mac";
			Matchers = new NativeInputDeviceMatcher[3]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3853,
					ProductID = (ushort)10
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)62725
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3853,
					ProductID = (ushort)13
				}
			};
		}
	}
}
