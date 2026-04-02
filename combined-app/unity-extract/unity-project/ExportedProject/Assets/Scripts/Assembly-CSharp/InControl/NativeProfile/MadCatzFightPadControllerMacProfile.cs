namespace InControl.NativeProfile
{
	public class MadCatzFightPadControllerMacProfile : Xbox360DriverMacProfile
	{
		public MadCatzFightPadControllerMacProfile()
		{
			base.Name = "Mad Catz FightPad Controller";
			base.Meta = "Mad Catz FightPad Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[2]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)61480
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1848,
					ProductID = (ushort)18216
				}
			};
		}
	}
}
