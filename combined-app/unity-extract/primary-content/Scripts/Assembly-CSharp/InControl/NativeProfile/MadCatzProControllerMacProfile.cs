namespace InControl.NativeProfile
{
	public class MadCatzProControllerMacProfile : Xbox360DriverMacProfile
	{
		public MadCatzProControllerMacProfile()
		{
			base.Name = "Mad Catz Pro Controller";
			base.Meta = "Mad Catz Pro Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1848,
					ProductID = (ushort)18214
				}
			};
		}
	}
}
