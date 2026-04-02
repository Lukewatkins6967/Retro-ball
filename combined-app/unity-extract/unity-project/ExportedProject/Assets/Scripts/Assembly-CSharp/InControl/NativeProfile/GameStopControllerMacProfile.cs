namespace InControl.NativeProfile
{
	public class GameStopControllerMacProfile : Xbox360DriverMacProfile
	{
		public GameStopControllerMacProfile()
		{
			base.Name = "GameStop Controller";
			base.Meta = "GameStop Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[4]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3695,
					ProductID = (ushort)1025
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3695,
					ProductID = (ushort)769
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)4779,
					ProductID = (ushort)770
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)63745
				}
			};
		}
	}
}
