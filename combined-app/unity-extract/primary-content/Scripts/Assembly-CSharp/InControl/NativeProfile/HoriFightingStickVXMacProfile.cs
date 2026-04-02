namespace InControl.NativeProfile
{
	public class HoriFightingStickVXMacProfile : Xbox360DriverMacProfile
	{
		public HoriFightingStickVXMacProfile()
		{
			base.Name = "Hori Fighting Stick VX";
			base.Meta = "Hori Fighting Stick VX on Mac";
			Matchers = new NativeInputDeviceMatcher[2]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)62723
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)21762
				}
			};
		}
	}
}
